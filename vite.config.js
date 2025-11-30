import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: true,
    port: 3000,
    // 解决本地开发时的WebSocket连接问题
    hmr: {
      clientPort: 3000
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 确保资源文件名包含唯一哈希值
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  // 根据环境设置base路径：开发环境使用'/'，生产环境使用GitHub Pages子目录路径
  base: process.env.NODE_ENV === 'production' ? '/clothing-inventory-management/' : '/'
})