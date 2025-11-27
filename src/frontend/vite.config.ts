import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    allowedHosts: ['webview.ngrok.dev'],
    proxy: {
      '/api': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
