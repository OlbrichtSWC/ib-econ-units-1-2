import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// base: './' makes the built site work from any folder or link
// (GitHub Pages, Netlify, or a USB stick).
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered in src/main.tsx, which reloads the page once a new version is ready.
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'IB Economics: Units 1 and 2',
        short_name: 'IB Econ 1-2',
        description: 'Games and simulations for IB Economics Units 1 and 2.',
        theme_color: '#1D4ED8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        // App code is stored for offline use. Content and settings are NOT in this list,
        // so a teacher's edits show up on the next visit instead of being stuck in the cache.
        // A new version takes over open pages straight away, so nobody is stuck on an old one.
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['content/**', 'config/**'],
        // Content and settings: use the newest copy when online, the saved copy when offline.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/content/') || url.pathname.includes('/config/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'content' },
          },
        ],
      },
    }),
  ],
});
