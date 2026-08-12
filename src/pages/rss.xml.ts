// RSS feed of the Journal — the site's real dated record — rather than
// releases, which only carry a `year` in their schema and would need a
// fabricated exact date to appear in a feed. Every journal entry already
// narrates releases as they happen, so nothing of substance is missing.

import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getSortedJournalEntries } from '../lib/journal';

export const GET: APIRoute = async (context) => {
  const entries = await getSortedJournalEntries();

  return rss({
    title: 'Sennóide — Diário',
    description:
      'Atualizações do arquivo de Sennóide: lançamentos, rearranjos e vídeos, à medida que acontecem.',
    site: context.site!,
    // @astrojs/rss always appends a trailing slash to non-extension links
    // (even after a #fragment, which breaks the anchor) unless this is
    // false — see createCanonicalURL() in its source.
    trailingSlash: false,
    items: entries.map((entry) => ({
      title: entry.data.entry.pt,
      pubDate: entry.data.date,
      link: `/journal/#${entry.id}`,
    })),
    customData: '<language>pt-BR</language>',
  });
};
