import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  // Plugin para importar archivos .glsl, .vert, .frag directamente en JS
  plugins: [glsl()],
  
  server: {
    // Permite que otros en tu red local vean el proyecto usando tu IP
    host: true, 
    // Abre el navegador automáticamente al iniciar
    open: true, 
  },
  
  build: {
    // Aumenta el límite de advertencia de tamaño (Three.js y los modelos 3D son pesados)
    chunkSizeWarningLimit: 1500,
    // Asegura que los assets tengan nombres limpios al compilar
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      }
    }
  }
});