import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
	      server: {
	        port: 3001,
	        strictPort: true,
	        host: '0.0.0.0',
	        proxy: {
	          '/api': {
	            target: 'http://127.0.0.1:8000',
	            changeOrigin: true,
	            secure: false,
	          },
	        },
	      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2019',
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('purify')) {
                  return 'vendor-pdf';
                }
                if (id.includes('recharts')) {
                  return 'vendor-charts';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-icons';
                }
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'vendor-react';
                }
                return 'vendor';
              }
            }
          }
        }
      }
    };
});
