import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        verify: resolve(__dirname, 'verify.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        profile: resolve(__dirname, 'profile.html'),
        userProfileView: resolve(__dirname, 'user-profile-view.html'),
        settings: resolve(__dirname, 'settings.html'),
        friends: resolve(__dirname, 'friends.html')
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: true
  }
});
