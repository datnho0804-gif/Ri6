import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig(({ mode }) => {
  const isNative = mode === 'native';
  const base = process.env.VITE_BASE_PATH ?? (isNative ? './' : '/Ri6/');

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon.svg',
          'apple-touch-icon.png',
          'icons/logo.svg',
          'icons/pwa-192.png',
          'icons/pwa-512.png',
          'icons/maskable-512.png',
        ],
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        },
        manifest: {
          name: 'Sổ Tay Vườn Ri6',
          short_name: 'Ri6',
          description:
            'Sổ tay quản lý vườn sầu riêng Ri6 tại xã Lộc Tấn, tỉnh Đồng Nai (đất đỏ bazan, béc tưới gốc, offline-first).',
          lang: 'vi',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#14532d',
          background_color: '#faf8f5',
          icons: [
            {
              src: 'icons/pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
