import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // viewport:{
    //   width: 800,
    //   height: 600,
    // },
    video: {
      mode: 'on',
      size: {
        width: 1280,
        height: 720,
      },
    },

    launchOptions: {
      headless: false,
      args: [
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
});