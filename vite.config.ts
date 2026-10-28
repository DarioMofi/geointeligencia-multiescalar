import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // datos/ pesa ~60 MB de originales que el visor no lee directamente
    // (lee public/capas/, generado por scripts/preparar-capas.mjs).
    watch: { ignored: ['**/datos/**', '**/herramientas/**'] },
  },
});
