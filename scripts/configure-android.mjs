import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, 'assets');
const ANDROID_DIR = path.join(ROOT, 'android');
const MANIFEST_PATH = path.join(ANDROID_DIR, 'app/src/main/AndroidManifest.xml');
const MAIN_ACTIVITY_PATH = path.join(
  ANDROID_DIR,
  'app/src/main/java/com/tmnadim/boi/MainActivity.java'
);
const STYLES_PATH = path.join(ANDROID_DIR, 'app/src/main/res/values/styles.xml');

const ICON_SVG_FULL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" fill="none">
  <rect width="1024" height="1024" fill="#1D63ED" />
  <g transform="translate(224 256) scale(1.63)">
    <path d="M22 46H8V270H150L164 284H188L202 270H344V46H330" stroke="#FFFFFF" stroke-width="20" stroke-linecap="square" stroke-linejoin="miter" />
    <path d="M36 22C82 28 128 42 164 68V250C128 228 82 216 36 210V22Z" fill="#FFFFFF" />
    <path d="M316 22C270 28 224 42 188 68V250C224 228 270 216 316 210V22Z" fill="#FFFFFF" />
    <path d="M232 34L276 26V138L254 118L232 138V34Z" fill="#1D63ED" />
    <path d="M242 32L266 28V118L254 107L242 118V32Z" fill="#FFFFFF" />
  </g>
</svg>`;

const ICON_SVG_FOREGROUND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" fill="none">
  <g transform="translate(256 284) scale(1.45)">
    <path d="M22 46H8V270H150L164 284H188L202 270H344V46H330" stroke="#FFFFFF" stroke-width="20" stroke-linecap="square" stroke-linejoin="miter" />
    <path d="M36 22C82 28 128 42 164 68V250C128 228 82 216 36 210V22Z" fill="#FFFFFF" />
    <path d="M316 22C270 28 224 42 188 68V250C224 228 270 216 316 210V22Z" fill="#FFFFFF" />
    <path d="M232 34L276 26V138L254 118L232 138V34Z" fill="#1D63ED" />
    <path d="M242 32L266 28V118L254 107L242 118V32Z" fill="#FFFFFF" />
  </g>
</svg>`;

const ICON_SVG_BACKGROUND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#1D63ED" />
</svg>`;

const SPLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732" fill="none">
  <rect width="2732" height="2732" fill="#F7F8FA" />
  <rect x="1116" y="1116" width="500" height="500" rx="112" fill="#1D63ED" />
  <g transform="translate(1196 1212) scale(0.96)">
    <path d="M22 46H8V270H150L164 284H188L202 270H344V46H330" stroke="#FFFFFF" stroke-width="20" stroke-linecap="square" stroke-linejoin="miter" />
    <path d="M36 22C82 28 128 42 164 68V250C128 228 82 216 36 210V22Z" fill="#FFFFFF" />
    <path d="M316 22C270 28 224 42 188 68V250C224 228 270 216 316 210V22Z" fill="#FFFFFF" />
    <path d="M232 34L276 26V138L254 118L232 138V34Z" fill="#1D63ED" />
    <path d="M242 32L266 28V118L254 107L242 118V32Z" fill="#FFFFFF" />
  </g>
</svg>`;

const SPLASH_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732" fill="none">
  <rect width="2732" height="2732" fill="#0B1120" />
  <rect x="1116" y="1116" width="500" height="500" rx="112" fill="#1D63ED" />
  <g transform="translate(1196 1212) scale(0.96)">
    <path d="M22 46H8V270H150L164 284H188L202 270H344V46H330" stroke="#FFFFFF" stroke-width="20" stroke-linecap="square" stroke-linejoin="miter" />
    <path d="M36 22C82 28 128 42 164 68V250C128 228 82 216 36 210V22Z" fill="#FFFFFF" />
    <path d="M316 22C270 28 224 42 188 68V250C224 228 270 216 316 210V22Z" fill="#FFFFFF" />
    <path d="M232 34L276 26V138L254 118L232 138V34Z" fill="#1D63ED" />
    <path d="M242 32L266 28V118L254 107L242 118V32Z" fill="#FFFFFF" />
  </g>
</svg>`;

export function patchAndroidManifest(xml) {
  const entries = [
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
    '<uses-feature android:name="android.hardware.camera" android:required="false" />',
    '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
  ];

  const missing = entries.filter((line) => {
    const match = line.match(/android:name="([^"]+)"/);
    return match ? !xml.includes(match[1]) : !xml.includes(line);
  });

  if (missing.length === 0) return xml;

  const block = `\n    <!-- Boi runtime permissions & hardware features -->\n    ${missing.join('\n    ')}\n`;
  if (xml.includes('</manifest>')) {
    return xml.replace('</manifest>', `${block}</manifest>`);
  }
  return `${xml}${block}`;
}

export function createMainActivityJava() {
  return `package com.tmnadim.boi;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep WebView below system bars on Android 11-14
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Never draw app content inside the display notch / camera cutout
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;
            getWindow().setAttributes(lp);
        }

        // Apply system bar + display cutout insets on Android 15+ edge-to-edge devices
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() |
                    WindowInsetsCompat.Type.displayCutout()
                );
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(contentView);
        }
    }
}
`;
}

export function patchAndroidStyles(xml) {
  if (xml.includes('android:fitsSystemWindows')) return xml;
  const item = `        <item name="android:fitsSystemWindows">true</item>\n`;
  return xml.replace(
    /(<style[^>]*name="AppTheme\.NoActionBar"[^>]*>)/,
    `$1\n${item}`
  );
}

async function generateAssets() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  await sharp(Buffer.from(ICON_SVG_FULL)).png().toFile(path.join(ASSETS_DIR, 'icon-only.png'));
  await sharp(Buffer.from(ICON_SVG_FOREGROUND)).png().toFile(path.join(ASSETS_DIR, 'icon-foreground.png'));
  await sharp(Buffer.from(ICON_SVG_BACKGROUND)).png().toFile(path.join(ASSETS_DIR, 'icon-background.png'));
  await sharp(Buffer.from(SPLASH_SVG)).png().toFile(path.join(ASSETS_DIR, 'splash.png'));
  await sharp(Buffer.from(SPLASH_DARK_SVG)).png().toFile(path.join(ASSETS_DIR, 'splash-dark.png'));
  console.log('Generated Boi icon and splash PNG assets in ./assets');
}

async function main() {
  await generateAssets();

  if (!fs.existsSync(ANDROID_DIR)) {
    console.log('No ./android directory found yet; skipping native Android patches.');
    return;
  }

  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
    fs.writeFileSync(MANIFEST_PATH, patchAndroidManifest(manifest), 'utf8');
    console.log('Patched AndroidManifest.xml with camera, media, and audio permissions.');
  }

  fs.mkdirSync(path.dirname(MAIN_ACTIVITY_PATH), { recursive: true });
  fs.writeFileSync(MAIN_ACTIVITY_PATH, createMainActivityJava(), 'utf8');
  console.log('Updated MainActivity.java to exclude notch/display cutout and apply system bar insets.');

  if (fs.existsSync(STYLES_PATH)) {
    const styles = fs.readFileSync(STYLES_PATH, 'utf8');
    fs.writeFileSync(STYLES_PATH, patchAndroidStyles(styles), 'utf8');
    console.log('Patched styles.xml with fitsSystemWindows and cutout exclusion.');
  }

  // Generate Android mipmap launcher icons & adaptive icons from ./assets
  execSync(
    'npx capacitor-assets generate --android --iconBackgroundColor "#1D63ED" --iconBackgroundColorDark "#0B1120" --splashBackgroundColor "#F7F8FA" --splashBackgroundColorDark "#0B1120"',
    { stdio: 'inherit', cwd: ROOT }
  );
  console.log('Generated Android launcher icons and splash screens.');
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
