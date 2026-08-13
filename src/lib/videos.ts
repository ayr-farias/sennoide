// Shared helpers for anything that lists or links videos — mirrors
// releases.ts. The cross-link direction is: a release declares which
// videos relate to it (`relatedVideos`, on the release schema); a video's
// "appears on" list is computed here by scanning releases rather than
// duplicated as a field on the video itself.

import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';
import type { ReleaseEntry } from './releases';
import { withBase } from './paths';

export type VideoEntry = CollectionEntry<'videos'>;

/** Non-draft videos, newest first. */
export async function getSortedVideos(): Promise<VideoEntry[]> {
  const all = await getCollection('videos', ({ data }) => !data.draft);
  return all.sort((a, b) => {
    if (a.data.year !== b.data.year) return b.data.year - a.data.year;
    return a.data.title.localeCompare(b.data.title);
  });
}

export function videoHref(lang: Lang, slug: string): string {
  return withBase(lang === 'en' ? `/en/videos/${slug}` : `/videos/${slug}`);
}

/** Releases whose `relatedVideos` points at the given video slug. */
export function getReleasesFeaturing(releases: ReleaseEntry[], videoSlug: string): ReleaseEntry[] {
  return releases.filter((r) => r.data.relatedVideos.includes(videoSlug));
}
