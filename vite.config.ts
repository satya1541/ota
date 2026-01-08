import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Skip anything not in node_modules
          if (!id.includes('node_modules')) {
            return;
          }

          // Framer Motion
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-animation';
          }

          // Leaflet
          if (id.includes('node_modules/leaflet/')) {
            return 'vendor-maps';
          }
          
          // PDF generation - lazy loaded, split separately
          if (id.includes('node_modules/jspdf/')) {
            return 'vendor-jspdf';
          }
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-html2canvas';
          }
          
          // Charts (recharts + d3) - large, often lazy loaded
          if (id.includes('node_modules/recharts/') || 
              id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          
          // Radix UI components
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          
          // React Query
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }
          
          // Form handling
          if (id.includes('node_modules/react-hook-form/') || 
              id.includes('node_modules/@hookform/')) {
            return 'vendor-forms';
          }
          
          // Zod validation (used on both client and shared)
          if (id.includes('node_modules/zod/')) {
            return 'vendor-zod';
          }

          // Lucide Icons
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
