import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Backstage build: a second entry (`admin.html`) deployed on its own host.
 * Shares every source file with the tenant site but keeps its own output
 * directory, so the two can be uploaded as separate Pages projects.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8011",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist-admin",
    sourcemap: false,
    rollupOptions: {
      input: { admin: resolve(__dirname, "admin.html") },
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom", "react-helmet-async"],
          motion: ["motion"],
          i18n: ["i18next", "react-i18next"],
          query: ["@tanstack/react-query"],
          forms: ["react-hook-form", "zod", "@hookform/resolvers"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
