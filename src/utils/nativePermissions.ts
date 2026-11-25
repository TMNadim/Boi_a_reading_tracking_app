import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { StatusBar, Style } from '@capacitor/status-bar';

export type PermissionResult = 'granted' | 'denied';

/**
 * Ensures runtime camera permission is granted on native Android/iOS via Capacitor
 * before opening a live WebView getUserMedia stream.
 * On web browsers, returns 'granted' so the browser's own getUserMedia prompt handles it.
 */
export async function ensureNativeCameraPermission(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return 'granted';
  }

  try {
    const current = await Camera.checkPermissions();
    if (current.camera === 'granted') {
      return 'granted';
    }
    const requested = await Camera.requestPermissions({ permissions: ['camera'] });
    return requested.camera === 'granted' ? 'granted' : 'denied';
  } catch {
    // Fallback to WebView getUserMedia prompt if plugin check throws
    return 'granted';
  }
}

/**
 * Ensures runtime photo/gallery permission is granted on native mobile when picking a barcode photo.
 */
export async function ensureNativePhotoPermission(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return 'granted';
  }

  try {
    const current = await Camera.checkPermissions();
    if (current.photos === 'granted' || current.photos === 'limited') {
      return 'granted';
    }
    const requested = await Camera.requestPermissions({ permissions: ['photos'] });
    return requested.photos === 'granted' || requested.photos === 'limited'
      ? 'granted'
      : 'denied';
  } catch {
    return 'granted';
  }
}

/**
 * Opens the native Android/iOS Camera or Photo Library prompt and returns a data URL.
 * Returns null if running on web or if the user cancels.
 */
export async function pickNativeBarcodeImageDataUrl(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  await ensureNativeCameraPermission();
  await ensureNativePhotoPermission();

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
  });

  return photo.dataUrl ?? null;
}

/**
 * Keeps the native status bar opaque (non-overlapping with WebView) and matches Light/Dark theme.
 */
export async function syncNativeStatusBar(theme: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    if (theme === 'dark') {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#101827' });
    } else {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    }
  } catch {
    // Ignore on platforms where StatusBar API is partially supported
  }
}
