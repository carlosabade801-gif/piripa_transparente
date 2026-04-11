import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Em dev, /api/* → Node.js local que repassa para os servidores externos
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
