import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMainActivityJava,
  patchAndroidManifest,
  patchAndroidStyles,
} from './configure-android.mjs';

const SAMPLE_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="Boi"></application>
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>`;

const SAMPLE_STYLES = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
    </style>
</resources>`;

test('patchAndroidManifest injects camera, media, audio permissions and is idempotent', () => {
  const once = patchAndroidManifest(SAMPLE_MANIFEST);
  assert.match(once, /android\.permission\.CAMERA/);
  assert.match(once, /android\.permission\.READ_MEDIA_IMAGES/);
  assert.match(once, /android\.permission\.READ_EXTERNAL_STORAGE/);
  assert.match(once, /android\.permission\.MODIFY_AUDIO_SETTINGS/);
  assert.match(once, /android\.hardware\.camera/);

  const twice = patchAndroidManifest(once);
  assert.equal(twice, once);
});

test('patchAndroidStyles adds fitsSystemWindows without API-28-only XML attributes and is idempotent', () => {
  const once = patchAndroidStyles(SAMPLE_STYLES);
  assert.match(once, /android:fitsSystemWindows">true/);
  assert.doesNotMatch(once, /windowLayoutInDisplayCutoutMode/);

  const twice = patchAndroidStyles(once);
  assert.equal(twice, once);
});

test('createMainActivityJava excludes display cutout and applies system bar + cutout insets', () => {
  const java = createMainActivityJava();
  assert.match(java, /package com\.tmnadim\.boi;/);
  assert.match(java, /WindowCompat\.setDecorFitsSystemWindows\(getWindow\(\), true\)/);
  assert.match(java, /LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER/);
  assert.match(java, /WindowInsetsCompat\.Type\.displayCutout\(\)/);
  assert.match(java, /WindowInsetsCompat\.Type\.systemBars\(\)/);
});
