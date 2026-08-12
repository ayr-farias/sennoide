import { getCollection, type CollectionEntry } from 'astro:content';

export type CommentEntry = CollectionEntry<'comments'>;

/** Published comments, newest first. Not filtered by page language — a
 *  comment's text isn't translated, so both /comments and /en/comments
 *  show the exact same list; only the surrounding UI chrome differs. */
export async function getSortedComments(): Promise<CommentEntry[]> {
  const all = await getCollection('comments', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
