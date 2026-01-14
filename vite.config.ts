import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        // VitePWA({
        //   registerType: 'autoUpdate',
        //   includeAssets: [],
        //   manifest: {
        //     name: 'OSPrimeX - Gestão de Oficinas',
        //     short_name: 'OSPrimeX',
        //     description: 'Sistema completo para gestão de oficinas mecânicas',
        //     theme_color: '#137fec',
        //     background_color: '#ffffff',
        //     display: 'standalone',
        //     scope: '/',
        //     start_url: '/',
        //     orientation: 'portrait',
        //     icons: [
        //       {
        //         src: 'pwa-192x192.png',
        //         sizes: '192x192',
        //         type: 'image/png'
        //       },
        //       {
        //         src: 'pwa-512x512.png',
        //         sizes: '512x512',
        //         type: 'image/png',
        //         purpose: 'any maskable'
        //       }
        //     ]
        //   },
        //   workbox: {
        //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
        //   },
        //   devOptions: {
        //     enabled: true,
        //     type: 'module',
        //   }
        // })
    ],
    server: {
        port: 5173,
        open: true
    }
})
