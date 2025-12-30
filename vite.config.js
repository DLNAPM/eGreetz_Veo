
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    // We define these globally so they are swapped during build/dev.
    // This is the most reliable way to ensure environment variables from Render.com
    // are accessible in the client-side code.
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
      'process.env.VITE_FIREBASE_CONFIG': JSON.stringify(env.VITE_FIREBASE_CONFIG),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
      'process.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID),
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
  };
});
