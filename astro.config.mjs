// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: replace with the real production domain before deploying.
  // Sitemap + canonical/hreflang tags in BaseLayout.astro depend on this.
  site: 'https://ayr-farias.github.io',
  //base: "/sennoide",

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap()],

  i18n: {
    // Portuguese is the primary language and lives at the site root ("/").
    // English lives under "/en/". This is Astro's built-in i18n routing —
    // it doesn't move files around, it just tells Astro (and things like
    // getRelativeLocaleUrl) how the two trees relate.
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
