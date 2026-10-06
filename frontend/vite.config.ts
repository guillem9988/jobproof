import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Never inline assets as data: URIs (fonts included), so the CSP can keep font-src 'self'.
  build: { assetsInlineLimit: 0 },
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
