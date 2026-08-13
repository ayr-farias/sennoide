// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages project site: served from the `sennoide` repo at a
  // subpath, not the domain root. `site` must include that subpath too —
  // sitemap and canonical/hreflang tags in BaseLayout.astro build off it.
  site: 'https://ayr-farias.github.io/sennoide',
  base: '/sennoide',

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
