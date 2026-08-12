import { getCollection, type CollectionEntry } from 'astro:content';

export type JournalEntry = CollectionEntry<'journal'>;

/** Journal entries, newest first. */
export async function getSortedJournalEntries(): Promise<JournalEntry[]> {
  const all = await getCollection('journal');
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export interface JournalYearGroup {
  year: number;
  entries: JournalEntry[];
}

export function groupJournalByYear(entries: JournalEntry[]): JournalYearGroup[] {
  const byYear = new Map<number, JournalEntry[]>();
  for (const entry of entries) {
    // getUTCFullYear(), not getFullYear() — the date is parsed as UTC
    // midnight from plain YYYY-MM-DD frontmatter, so the local-time
    // getter can misfile a Jan 1 entry into the previous year for
    // anyone west of UTC.
    const year = entry.data.date.getUTCFullYear();
    const list = byYear.get(year) ?? [];
    list.push(entry);
    byYear.set(year, list);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, entries]) => ({ year, entries }));
}
