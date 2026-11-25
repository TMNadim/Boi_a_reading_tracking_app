import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, ImageUp, RefreshCw, X } from 'lucide-react';
import { isValidIsbn, normalizeIsbn } from '../utils/isbnLookup';
import { Capacitor } from '@capacitor/core';
import {
  ensureNativeCameraPermission,
  ensureNativePhotoPermission,
  pickNativeBarcodeImageDataUrl,
} from '../utils/nativePermissions';

interface IsbnScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (isbn: string) => void;
}

function createIsbnReader(): BrowserMultiFormatReader {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.CODE_128,
  ]);
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 200,
    delayBetweenScanSuccess: 800,
  });
}

export function IsbnScannerModal({
  isOpen,
  onClose,
  onDetected,
}: IsbnScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusHint, setStatusHint] = useState('Align the book barcode inside the frame.');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [isDecodingPhoto, setIsDecodingPhoto] = useState(false);

  const stopScanner = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // Ignore teardown errors
      }
      controlsRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let cancelled = false;
    const reader = createIsbnReader();

    const startCamera = async () => {
      setCameraState('starting');
      setErrorMessage('');
      setStatusHint('Requesting camera permission...');

      // On native Android/iOS, request OS runtime camera permission first
      const nativePerm = await ensureNativeCameraPermission();
      if (cancelled) return;
      if (nativePerm === 'denied') {
        setCameraState('error');
        setErrorMessage(
          'Camera permission was denied. Tap Retry Permission, enable Camera in device settings, or scan from a photo below.'
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setErrorMessage(
          'Live camera scanning is unavailable here. Upload or capture a barcode photo below instead.'
        );
        return;
      }

      try {
        const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!cancelled) {
          setDevices(videoDevices);
        }

        const chosenDevice = videoDevices[selectedDeviceIndex];
        const constraints: MediaStreamConstraints = chosenDevice?.deviceId
          ? { video: { deviceId: { exact: chosenDevice.deviceId } } }
          : { video: { facingMode: { ideal: 'environment' } } };

        if (!videoRef.current || cancelled) return;

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result) => {
            if (!result || cancelled) return;
            const rawText = result.getText();
            const clean = normalizeIsbn(rawText);
            if (isValidIsbn(clean)) {
              stopScanner();
              onDetected(clean);
            } else {
              setStatusHint(`Detected "${rawText}" — keep steady on the ISBN-13 barcode.`);
            }
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setCameraState('active');
        setStatusHint('Point camera at the back-cover ISBN barcode.');
      } catch (err) {
        if (cancelled) return;
        setCameraState('error');
        const msg = (err as Error)?.name;
        if (msg === 'NotAllowedError' || msg === 'PermissionDeniedError') {
          setErrorMessage(
            'Camera permission was denied. Allow camera access or scan from a barcode photo below.'
          );
        } else {
          setErrorMessage(
            'No live camera detected. You can upload or capture a barcode photo below.'
          );
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, selectedDeviceIndex, retryTick, onDetected]);

  const decodeBarcodeFromImageSrc = async (imageSrc: string) => {
    setIsDecodingPhoto(true);
    setErrorMessage('');
    try {
      const reader = createIsbnReader();
      const result = await reader.decodeFromImageUrl(imageSrc);
      const clean = normalizeIsbn(result.getText());
      if (isValidIsbn(clean)) {
        stopScanner();
        onDetected(clean);
      } else {
        setErrorMessage(
          `Found barcode "${result.getText()}", which is not a valid ISBN-10 or ISBN-13.`
        );
      }
    } catch {
      setErrorMessage(
        'Could not read a clear ISBN barcode from that image. Try a sharper, well-lit photo.'
      );
    } finally {
      setIsDecodingPhoto(false);
    }
  };

  const handleOpenPhotoPicker = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const dataUrl = await pickNativeBarcodeImageDataUrl();
        if (dataUrl) {
          await decodeBarcodeFromImageSrc(dataUrl);
        }
        return;
      } catch (err) {
        const message = (err as Error)?.message?.toLowerCase() ?? '';
        if (message.includes('cancel')) {
          return;
        }
        // Fallback to standard file picker if native plugin throws
      }
    }
    await ensureNativePhotoPermission();
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    try {
      await decodeBarcodeFromImageSrc(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="isbn-scanner-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-2xl dark:border-slate-800 dark:bg-[#131B2E]">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#1D63ED] dark:text-[#60A5FA]" aria-hidden="true" />
            <h2
              id="isbn-scanner-title"
              className="text-base font-semibold text-[#121826] dark:text-slate-100"
            >
              Scan ISBN Barcode
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            aria-label="Close barcode scanner"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#5A6577] hover:bg-slate-100 hover:text-[#121826] dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          {/* Live Camera Viewfinder */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#E4E7EC] bg-[#0B1120] dark:border-slate-800">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`h-full w-full object-cover ${cameraState === 'active' ? 'opacity-100' : 'opacity-0'}`}
            />

            {cameraState === 'active' && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
              >
                <div className="relative h-28 w-full max-w-[260px] rounded-xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(11,17,32,0.45)]">
                  <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-[#3B82F6]" />
                </div>
              </div>
            )}

            {cameraState === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-slate-300">
                <Camera className="h-7 w-7 opacity-70" aria-hidden="true" />
                <p className="mt-2.5 text-xs font-medium">{statusHint}</p>
              </div>
            )}

            {cameraState === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-slate-300">
                <Camera className="h-7 w-7 text-slate-400" aria-hidden="true" />
                <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={() => setRetryTick((t) => t + 1)}
                  className="mt-3.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#1D63ED] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1550C8]"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry Camera</span>
                </button>
              </div>
            )}
          </div>

          {cameraState === 'active' && (
            <p className="mt-3 text-center text-xs text-[#5A6577] dark:text-slate-400">
              {statusHint}
            </p>
          )}

          {errorMessage && cameraState !== 'error' && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {errorMessage}
            </p>
          )}

          {/* Scanner Actions: Upload Barcode Image + Switch Camera */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isDecodingPhoto}
              onClick={() => void handleOpenPhotoPicker()}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#D5DBE5] bg-white px-4 py-2 text-xs font-semibold text-[#121826] transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-[#0B1120] dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <ImageUp className="h-4 w-4" aria-hidden="true" />
              <span>{isDecodingPhoto ? 'Reading Barcode...' : 'Scan from Photo'}</span>
            </button>

            {devices.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedDeviceIndex((i) => (i + 1) % devices.length)}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#D5DBE5] px-3.5 py-2 text-xs font-medium text-[#5A6577] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Switch Camera</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
