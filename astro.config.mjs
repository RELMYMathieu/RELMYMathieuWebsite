// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: 'https://relmymathieu.me',
  integrations: [sitemap(), mdx()],
    vite: {
    plugins: [tailwindcss()],
  }
});