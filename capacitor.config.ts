import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmnadim.boi',
  appName: 'Boi',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
  },
  android: {
    backgroundColor: '#F7F8FA',
  },
};

export default config;