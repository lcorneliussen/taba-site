import { defineConfig } from 'astro/config';
import { searchIndex } from './src/lib/search-index.mjs';

export default defineConfig({
  site: 'https://taba.sh',
  base: '/',
  trailingSlash: 'always',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [searchIndex()],
  vite: {
    server: { strictPort: true },
  },
});
