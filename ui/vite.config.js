// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api calls to backend during development
      // (optional — api.js uses full URL so this is a fallback)
      "/upload": "http://localhost:3000",
      "/download": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/ledger": "http://localhost:3000",
    },
  },
});
