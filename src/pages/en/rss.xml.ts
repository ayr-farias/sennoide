import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getSortedJournalEntries } from '../../lib/journal';
import { withBase } from '../../lib/paths';

export const GET: APIRoute = async (context) => {
  const entries = await getSortedJournalEntries();

  return rss({
    title: 'Sennóide — Journal',
    description:
      "Updates from the Sennóide archive: releases, arrangements, and videos, as they happen.",
    site: context.site!,
    trailingSlash: false,
    items: entries.map((entry) => ({
      title: entry.data.entry.en,
      pubDate: entry.data.date,
      link: withBase(`/en/journal/#${entry.id}`),
    })),
    customData: '<language>en-us</language>',
  });
};
