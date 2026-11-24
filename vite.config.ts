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
          'icons/pwa-48.png',
          'icons/pwa-72.png',
          'icons/pwa-96.png',
          'icons/pwa-144.png',
          'icons/pwa-192.png',
          'icons/pwa-512.png',
          'icons/maskable-512.png',
          'icons/monochrome-512.png',
        ],
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          globIgnores: ['screenshots/**'],
        },
        manifest: {
          id: isNative ? './' : '/Ri6/',
          name: 'Sổ Tay Vườn Ri6',
          short_name: 'Ri6',
          description:
            'Sổ tay quản lý vườn sầu riêng Ri6 tại xã Lộc Tấn, tỉnh Đồng Nai (đất đỏ bazan, béc tưới gốc, offline-first).',
          lang: 'vi',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'any',
          theme_color: '#faf8f5',
          background_color: '#faf8f5',
          icons: [
            { src: 'icons/pwa-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
            { src: 'icons/pwa-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
            { src: 'icons/pwa-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
            { src: 'icons/pwa-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'icons/monochrome-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'monochrome',
            },
          ],
          shortcuts: [
            {
              name: 'Ghi nhật ký',
              short_name: 'Nhật ký',
              description: 'Mở nhanh biểu mẫu ghi nhật ký bón phân, phun thuốc, tưới nước',
              url: `${base}#/log`,
              icons: [{ src: 'icons/pwa-96.png', sizes: '96x96', type: 'image/png' }],
            },
            {
              name: 'Chụp ảnh tuần',
              short_name: 'Ảnh tuần',
              description: 'Mở danh sách cây để chụp ảnh theo dõi hằng tuần',
              url: `${base}#/photo`,
              icons: [{ src: 'icons/pwa-96.png', sizes: '96x96', type: 'image/png' }],
            },
            {
              name: 'Việc cần làm',
              short_name: 'Việc làm',
              description: 'Xem tổng quan và danh sách việc cần làm hôm nay',
              url: `${base}#/agenda`,
              icons: [{ src: 'icons/pwa-96.png', sizes: '96x96', type: 'image/png' }],
            },
          ],
          screenshots: [
            {
              src: 'screenshots/narrow-overview.png',
              sizes: '1080x2400',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Tổng quan vườn Ri6, mùa vụ và trạng thái dữ liệu offline',
            },
            {
              src: 'screenshots/narrow-log-sheet.png',
              sizes: '1080x2400',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Biểu mẫu ghi nhật ký một tay dạng BottomSheet',
            },
            {
              src: 'screenshots/narrow-settings.png',
              sizes: '1080x2400',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Cài đặt ứng dụng, rung nhẹ và quản lý bộ nhớ bền vững',
            },
            {
              src: 'screenshots/wide-desktop.png',
              sizes: '1280x800',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Giao diện màn hình rộng với thanh Navigation Rail bên trái',
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
