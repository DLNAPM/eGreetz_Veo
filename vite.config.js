
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the code to use process.env.API_KEY directly as required by the instructions
    // It maps the Node.js environment variable to the client-side execution context.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
  },
  server: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    allowedHosts: [
      'egreetz.onrender.com'
    ]
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    allowedHosts: [
      'egreetz.onrender.com'
    ]
  }
});
