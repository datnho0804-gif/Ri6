import { defineConfig } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    transparent: {
      sizes: [48, 72, 96, 144, 192, 512],
      favicons: [[32, 'favicon.ico']],
      padding: 0,
      resizeOptions: {
        background: '#faf8f5',
      },
    },
    maskable: {
      sizes: [512],
      padding: 0.09,
      resizeOptions: {
        background: '#faf8f5',
      },
    },
    apple: {
      sizes: [180],
      padding: 0.02,
      resizeOptions: {
        background: '#faf8f5',
      },
    },
  },
  images: ['public/icons/logo.svg'],
});
