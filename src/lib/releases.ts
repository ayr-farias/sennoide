// Shared helpers for anything that lists or links releases (the Music
// index, the homepage's "Latest releases", and cross-links on release
// pages themselves) so the sort order and grouping logic lives in one
// place instead of being re-implemented per page.

import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';
import { withBase } from './paths';

export type ReleaseEntry = CollectionEntry<'releases'>;

/** Non-draft releases, oldest first (matches chronological prev/next). */
export async function getSortedReleases(): Promise<ReleaseEntry[]> {
  const all = await getCollection('releases', ({ data }) => !data.draft);
  return all.sort((a, b) => {
    if (a.data.year !== b.data.year) return a.data.year - b.data.year;
    return a.data.title.localeCompare(b.data.title);
  });
}

export interface YearGroup {
  year: number;
  releases: ReleaseEntry[];
}

/** Groups already-sorted releases by year, newest year first (each year's
 *  releases keep their relative order). */
export function groupByYear(releases: ReleaseEntry[]): YearGroup[] {
  const byYear = new Map<number, ReleaseEntry[]>();
  for (const release of releases) {
    const list = byYear.get(release.data.year) ?? [];
    list.push(release);
    byYear.set(release.data.year, list);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, releases]) => ({ year, releases }));
}

export function releaseHref(lang: Lang, slug: string): string {
  return withBase(lang === 'en' ? `/en/music/${slug}` : `/music/${slug}`);
}

/** Releases whose `relatedReleases` points at the given slug — computed
 *  from the full set rather than hand-maintained on both sides, so e.g. an
 *  AI arrangement only needs to declare the original it revisits once. */
export function getReferencedBy(all: ReleaseEntry[], slug: string): ReleaseEntry[] {
  return all.filter((r) => r.data.relatedReleases.includes(slug));
}

export function getChronologicalNeighbors(sorted: ReleaseEntry[], id: string) {
  const index = sorted.findIndex((r) => r.id === id);
  return {
    prev: index > 0 ? sorted[index - 1] : null,
    next: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null,
  };
}
