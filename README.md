# Sennóide

The official bilingual archive for Sennóide — an independent solo music
project active since 2021. Built as a static Astro site: no CMS, no
database, no third-party streaming embeds. Content lives in the repo as
text and media files; the site is the primary listening experience.

This repo covers Phases 1–2 of a four-phase build. See **Roadmap** below.

## Stack

| Purpose    | Technology                                    |
| ---------- | ---------------------------------------------- |
| Framework  | Astro 7                                        |
| Language   | TypeScript                                     |
| Styling    | Tailwind CSS v4 (CSS-first, via `@theme`)      |
| i18n       | Astro's built-in i18n routing + a small dictionary in `src/lib/i18n.ts` |
| Content    | Astro Content Collections (`src/content.config.ts`) |
| Audio      | Web Audio API — custom engine, no `<audio>` element (`src/lib/player/`) |
| Fonts      | Space Grotesk, Inter, IBM Plex Mono — self-hosted via Fontsource |
| Icons      | lucide-static (raw SVG imports)                |
| Deployment | static output — Cloudflare Pages, Netlify, or Bunny.net |

No UI framework (React/Vue/etc.) is installed. Every interactive piece —
the mobile nav toggle, the audio player — is vanilla TypeScript. Add a
framework only when a feature genuinely needs client-side state a
`<script>` tag can't reasonably handle; nothing has, so far.

## Running it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
npm run astro check   # type-check .astro files
```

## Bilingual routing

Portuguese is the default language and lives at the site root. English
lives under `/en/`. Both trees use the *same* slugs (`/about` and
`/en/about`), which is what makes the language switcher a plain prefix
swap rather than a lookup table — see `getLocalizedPath()` in
`src/lib/i18n.ts`.

- New page → create it in `src/pages/whatever.astro` **and**
  `src/pages/en/whatever.astro`.
- New nav item → add it to the `links` array in `src/components/Nav.astro`
  and the matching `nav.*` keys in `src/lib/i18n.ts`.
- New UI string (button label, empty-state message, etc.) → add a key to
  **both** the `pt` and `en` objects in `src/lib/i18n.ts`, then read it
  with `t('your.key')`. Page-specific prose (About's paragraphs, for
  example) is written directly in each page file instead, in its own
  language — no key needed for one-off content.

## Design tokens

Defined once in `src/styles/global.css`, both as CSS custom properties and
inside Tailwind's `@theme` block (so `bg-bg`, `text-muted`, `bg-accent`,
`font-display`, etc. all work as utility classes):

```
--color-bg:      #0f0e14
--color-surface: #19161f   (cards — the audio player's background, etc.)
--color-text:    #f4f3f7
--color-muted:   #9c97aa
--color-border:  #2d2a37
--color-accent:  #9e7dfa
```

Headings use Space Grotesk, body text uses Inter, and IBM Plex Mono is
reserved for technical/incidental detail — years, catalog numbers,
timestamps, kicker labels (see `.kicker` in `global.css`).

**Signature element:** the animated sine wave used as a section divider
(`src/components/SineDivider.astro`) is the one recurring motif on the
site — a literal sine wave, for a project named after one. The waveform in
the audio player picks up the same idea for real, rendering actual decoded
audio as bars.

## Content model

Releases and journal entries are Astro Content Collections, defined in
`src/content.config.ts` and stored as Markdown+frontmatter in
`src/content/releases/` and `src/content/journal/`.

Releases are **not** split into `pt/`/`en/` folders — one release is one
file. Most fields (year, type, tracklist, audio paths) aren't language
dependent; only the handful a listener actually reads (`description`,
track `lyrics`, credit `role`) are bilingual `{ pt, en }` pairs inside
otherwise-shared frontmatter. This keeps a release from ever having its
two language versions drift out of sync.

```yaml
title: "Padrões Invisíveis"
year: 2024
type: album   # album | ep | single | compilation | ai-arrangement | live | collaboration
cover: /artwork/padroes-invisiveis.svg
description:
  pt: "..."
  en: "..."
tracks:
  - title: "Abertura"
    duration: 12          # seconds — an estimate; the player uses real decoded duration
    audio:
      src: /audio/placeholder/padroes-invisiveis/01.wav
      downloads:
        - label: "WAV (prévia de demonstração)"
          href: /audio/placeholder/padroes-invisiveis/01.wav
credits:
  - role: { pt: "Composição, gravação e produção", en: "Composition, recording, and production" }
    name: Sennóide
relatedReleases: []   # e.g. an AI arrangement pointing back at the original it revisits
featured: false
draft: false
```

`relatedReleases` only needs to be declared on one side — `src/lib/releases.ts`
computes the reverse ("Arrangement available: …") from the full collection,
so an AI arrangement pointing at its original is enough to cross-link both
pages. The same file also handles chronological sort/grouping and the
"Earlier work / Later work" links on each release page.

**The audio and artwork under `public/audio/placeholder/` and
`public/artwork/` are placeholders**, not real Sennóide material —
synthesized sine-wave clips and generated SVG covers (see next section),
committed so the site works end-to-end out of the box. Replace them with
real Bunny.net URLs and artwork as they're ready; nothing about the schema
or player cares where the files actually live.

## Placeholder content generators

```bash
npm run gen:placeholder-audio      # scripts/generate-placeholder-audio.mjs
npm run gen:placeholder-artwork    # scripts/generate-placeholder-artwork.mjs
```

Both are deterministic (same slug → same output) and dependency-free. The
audio generator synthesizes short additive-sine melodies as WAV files —
each note's envelope starts/ends at exact silence, and every clip is
trimmed to a zero-crossing, so tracks in an album queue gaplessly with no
click at the splice, even though they're placeholders. The artwork
generator draws sine-wave-motif SVG covers, varied per slug, in tints of
the site's own accent color.

## Audio player

`src/lib/player/` — three small, framework-free modules, imported by
`src/components/player/ReleasePlayer.astro` (one player per release page,
scoped to that release's tracklist as its queue):

- **`engine.ts`** — `AudioEngine`. Built on the Web Audio API rather than
  an `<audio>` element, specifically so playback can be **gapless**:
  instead of waiting for one track's `ended` event and then starting the
  next (always a small gap), it schedules the next track's
  `AudioBufferSourceNode` to start at the exact sample where the current
  one ends, computed from `AudioContext.currentTime`. Also handles the
  queue, shuffle, repeat (off/all/one), seeking, and decoded-buffer
  caching.
- **`waveform.ts`** — `WaveformView`. Renders bar-style peaks from the same
  decoded `AudioBuffer` the engine plays (computed once, cached per
  buffer), redraws progress on every frame, and doubles as a click/keyboard
  seek control (`role="slider"`).
- **`mediaSession.ts`** — wires the engine to the Media Session API, so
  lock-screen and OS media controls show the current track and artwork and
  can drive playback. A no-op if the API doesn't exist.

Keyboard shortcuts (space, ←/→ to seek, `[`/`]` for previous/next track)
are wired in `releasePlayer.client.ts` and ignored while typing in a form
field.

## Folder structure

```
public/
  artwork/   audio/   photos/   video/   favicon/   ← media; artwork/ and audio/placeholder/ have generated placeholders
src/
  components/
    Nav, Footer, SineDivider, EmptyState, StubPage, ReleaseCard
    HomePage, MusicIndex, ReleasePage, JournalPage   ← shared pt/en page templates
    player/   ReleasePlayer.astro + releasePlayer.client.ts
  layouts/      BaseLayout.astro — every page renders through this
  pages/        pt pages at the root, en/ pages mirror them 1:1
                music/[slug].astro + en/music/[slug].astro — release pages
  lib/
    i18n.ts       dictionary + language-switching helpers
    releases.ts   sort/group/cross-link helpers for the releases collection
    journal.ts    sort/group helpers for the journal collection
    player/       engine.ts, waveform.ts, mediaSession.ts
  content/      releases/ journal/ — Markdown + frontmatter, see Content model
  content.config.ts   Zod schemas for the two collections
  styles/       global.css — tokens, fonts, base styles
scripts/        placeholder audio/artwork generators
```

## Before this goes live

A few things are intentionally left as placeholders and should be updated
before deploying:

- **`astro.config.mjs`** — `site` is a placeholder domain; update it to the
  real one (this feeds the sitemap and the canonical/hreflang tags in
  `BaseLayout.astro`).
- **About page copy** (`src/pages/about.astro` and `en/about.astro`) — a
  first draft based on what's known about the project. Worth a pass to
  make sure it sounds like you.
- **Homepage hero copy** — same idea, in `src/components/HomePage.astro`.
- **Every release's audio and artwork** — placeholder sine-tone WAVs and
  generated SVG covers, per Content model above. Swap `audio.src` /
  `audio.downloads` for real Bunny.net URLs and `cover` for real artwork
  release by release; the schema and player don't need any code changes
  for that.

## Roadmap

- **Phase 1 — Foundation** ✅: bilingual routing, global layout,
  navigation, dark theme, typography, responsive design, homepage, About
  page.
- **Phase 2 — Music Archive** ✅: content collections + release schema,
  release pages with credits/downloads/cross-links, the custom gapless
  audio player (queue, shuffle, repeat, waveform, Media Session, keyboard
  shortcuts), Music index organized by year with AI Arrangements surfaced
  up top, homepage wired to real releases/journal data, Journal page.
  `Videos` and `Links` are still "under construction" stubs.
- **Phase 3 — Videos**: video gallery/pages, cross-linking a release to
  its related videos (the `relatedVideos` field already exists on the
  release schema, just unused until this lands).
- **Phase 4 — Polish**: artwork-driven per-release accent colors, optional
  light theme, RSS feed, a `Links` page.
