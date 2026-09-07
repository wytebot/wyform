import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Function form (not the static object form) so pre-bundled/subpath imports like
        // 'react-dom/client' still land in the right bucket instead of producing an
        // empty chunk for 'react'.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react-vendor';
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('lucide-react')) return 'icons';
        }
      }
    }
  }
});

