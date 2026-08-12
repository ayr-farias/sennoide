// Content Collections schema — Phase 2.
//
// Releases live in a single collection (not split into pt/ and en/ folders)
// because most fields — year, type, tracklist, file paths — aren't language
// dependent. Only the handful of fields a listener actually reads (title,
// description, track titles, credit roles, lyrics) are bilingual, stored as
// { pt, en } pairs inside otherwise-shared frontmatter. This keeps one
// release as one file instead of two that can drift out of sync.
//
// Audio paths point at /audio/... under public/ for now (placeholder,
// self-generated sine-tone clips — see scripts/generate-placeholder-audio.mjs).
// Swap them for Bunny.net URLs later; the player and schema don't care where
// the file lives.

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const localizedString = z.object({
  pt: z.string(),
  en: z.string(),
});

const releaseTypes = [
  'album',
  'ep',
  'single',
  'compilation',
  'ai-arrangement',
  'live',
  'collaboration',
] as const;

const trackSchema = z.object({
  title: z.string(),
  /** Seconds. Optional — the player reads real duration off the audio file
   *  once metadata loads; this is only used to paint the tracklist before
   *  playback starts, so it doesn't sit at "--:--" the whole time. */
  duration: z.number().optional(),
  audio: z.object({
    /** File the player streams/decodes. Any format the browser can play. */
    src: z.string(),
    /** Explicit label per download link (e.g. "FLAC", "MP3 320") rather than
     *  fixed fields, so placeholder audio can say what it actually is
     *  instead of claiming a format it isn't. */
    downloads: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
  lyrics: localizedString.partial().optional(),
});

const creditSchema = z.object({
  role: localizedString,
  name: z.string(),
});

const releases = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!README.md'], base: './src/content/releases' }),
  schema: z.object({
    title: z.string(),
    year: z.number().int(),
    type: z.enum(releaseTypes),
    cover: z.string(),
    coverAlt: localizedString.optional(),
    description: localizedString,
    tracks: z.array(trackSchema).min(1),
    credits: z.array(creditSchema).default([]),
    /** Slugs of other releases in this collection — e.g. an AI arrangement
     *  pointing back at the original composition it reinterprets. */
    relatedReleases: z.array(z.string()).default([]),
    relatedVideos: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const journal = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!README.md'], base: './src/content/journal' }),
  schema: z.object({
    date: z.coerce.date(),
    entry: localizedString,
  }),
});

const videoKinds = ['visualizer', 'diy', 'live'] as const;

const videos = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!README.md'], base: './src/content/videos' }),
  schema: z.object({
    title: z.string(),
    year: z.number().int(),
    kind: z.enum(videoKinds),
    thumbnail: z.string(),
    thumbnailAlt: localizedString.optional(),
    description: localizedString,
    /** Seconds, for display in the grid before the video loads. */
    runtime: z.number().optional(),
    source: z.discriminatedUnion('type', [
      z.object({ type: z.literal('self-hosted'), src: z.string() }),
      z.object({ type: z.literal('youtube'), id: z.string() }),
      z.object({ type: z.literal('vimeo'), id: z.string() }),
    ]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { releases, journal, videos };
export const RELEASE_TYPES = releaseTypes;
export const VIDEO_KINDS = videoKinds;
