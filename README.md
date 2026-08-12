# Sennóide

The official bilingual archive for Sennóide — an independent solo music
project active since 2021. Built as a static Astro site: no CMS, no
database, no third-party streaming embeds. Content lives in the repo as
text and media files; the site is the primary listening experience.

This repo covers Phases 1–3 of a four-phase build. See **Roadmap** below.

Replacing the placeholder artwork/audio/video with the real thing, or
rewriting the placeholder copy? See **[CONTENT.md](./CONTENT.md)**.

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

Cross-links work the same way in both directions, always declared on one
side and computed on the other, so there's never a pair of fields that can
drift out of sync:

- `release.relatedReleases` ↔ computed "Arrangement available: …" — an AI
  arrangement declares the original(s) it revisits; `src/lib/releases.ts`
  computes the reverse for the original's page.
- `release.relatedVideos` ↔ computed "Appears on: …" — a release declares
  which videos relate to it; `src/lib/videos.ts` computes the reverse for
  each video's page.

`src/lib/releases.ts` also handles chronological sort/grouping and the
"Earlier work / Later work" links on each release page.

Videos are their own collection (`src/content/videos/`), schema also in
`content.config.ts`. A video's `source` is a discriminated union —
`{ type: 'self-hosted', src }` renders a native `<video>`; `{ type:
'youtube' | 'vimeo', id }` renders a privacy-enhanced iframe embed — so
self-hosting and third-party embeds are both first-class without picking
one up front.

**The audio, artwork, and video under `public/*/placeholder/` are
placeholders**, not real Sennóide material — synthesized sine-wave clips,
generated SVG covers, and a generated waveform-visualizer render (see next
section), committed so the site works end-to-end out of the box. Replace
them with real Bunny.net URLs and footage as they're ready; nothing about
the schema or player cares where the files actually live.

## Placeholder content generators

```bash
npm run gen:placeholder-audio      # scripts/generate-placeholder-audio.mjs
npm run gen:placeholder-artwork    # scripts/generate-placeholder-artwork.mjs
npm run gen:placeholder-video      # scripts/generate-placeholder-video.mjs — needs ffmpeg on PATH
```

The audio and artwork generators are deterministic (same slug → same
output) and dependency-free. The audio generator synthesizes short
additive-sine melodies as WAV files — each note's envelope starts/ends at
exact silence, and every clip is trimmed to a zero-crossing, so tracks in
an album queue gaplessly with no click at the splice, even though they're
placeholders. The artwork generator draws sine-wave-motif SVG covers,
varied per slug, in tints of the site's own accent color.

The video generator shells out to `ffmpeg` to render a `showwaves` visual
driven by one of the placeholder audio tracks, in the same accent color —
deliberately the *only* placeholder video content. There's no honest way
to synthesize fake "DIY" or "live" footage the way a sine tone can stand
in for a song, so those `kind`s are left for real footage; a generated
waveform, on the other hand, genuinely is what a "visualizer" video is.

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

## Comments

`/comments` and `/en/comments` are a **moderated static guestbook**, not a
live comment system — deliberately, since the rest of the site has no
backend or database, and adding one just for this would be a bigger
architectural shift than the feature is worth. There's no submission
form that posts anywhere:

1. A fan emails a comment via the `mailto:` link on the page (pre-filled
   subject/body).
2. You read it, decide whether to publish it, and commit a Markdown file
   to `src/content/comments/` yourself — same shape as every other
   collection (see **Content model**). Committing the file *is* the
   moderation step; there's no separate "approved" flag.
3. A `reply` field on that same file is how you reply publicly — it
   renders right under the comment, indented.

See **"Publishing a fan comment"** in [CONTENT.md](./CONTENT.md) for the
exact frontmatter. `src/lib/comments.ts` sorts newest-first; comment text
isn't `{ pt, en }` split like other content, since a fan's message is
whatever language they wrote it in — both `/comments` and `/en/comments`
show the same list, only the surrounding page chrome is translated.

## Folder structure

```
public/
  artwork/   audio/   photos/   video/   favicon/   ← media; artwork/, audio/placeholder/, video/placeholder/ have generated placeholders
src/
  components/
    Nav, Footer, SineDivider, EmptyState, ReleaseCard, VideoCard
    HomePage, MusicIndex, ReleasePage, JournalPage, VideosIndex, VideoPage,
    CommentsPage   ← shared pt/en page templates
    player/   ReleasePlayer.astro + releasePlayer.client.ts
  layouts/      BaseLayout.astro — every page renders through this
  pages/        pt pages at the root, en/ pages mirror them 1:1
                music/[slug].astro + en/music/[slug].astro — release pages
                videos/[slug].astro + en/videos/[slug].astro — video pages
                rss.xml.ts + en/rss.xml.ts — feed endpoints, not pages
  lib/
    i18n.ts       dictionary + language-switching helpers
    releases.ts   sort/group/cross-link helpers for the releases collection
    journal.ts    sort/group helpers for the journal collection
    videos.ts     sort/cross-link helpers for the videos collection
    comments.ts   sort helper for the comments collection
    player/       engine.ts, waveform.ts, mediaSession.ts
  content/      releases/ journal/ videos/ comments/ — Markdown + frontmatter, see Content model
  content.config.ts   Zod schemas for the four collections
  styles/       global.css — tokens, fonts, base styles
scripts/        placeholder audio/artwork/video generators
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
- **Every release's audio and artwork, every video** — placeholder
  sine-tone WAVs, generated SVG covers, and a generated visualizer, per
  Content model above. Swap `audio.src` / `audio.downloads` for real
  Bunny.net URLs, `cover` for real artwork, and add real `diy`/`live`
  videos release by release; the schema and player don't need any code
  changes for that.
- **Comments contact address** — `CONTACT_EMAIL` at the top of
  `src/components/CommentsPage.astro` is a placeholder
  (`seu-email@exemplo.com`); update it to the address you actually want
  fan comments sent to.

## Roadmap

- **Phase 1 — Foundation** ✅: bilingual routing, global layout,
  navigation, dark theme, typography, responsive design, homepage, About
  page.
- **Phase 2 — Music Archive** ✅: content collections + release schema,
  release pages with credits/downloads/cross-links, the custom gapless
  audio player (queue, shuffle, repeat, waveform, Media Session, keyboard
  shortcuts), Music index organized by year with AI Arrangements surfaced
  up top, homepage wired to real releases/journal data, Journal page.
- **Phase 3 — Videos** ✅: video collection/schema (self-hosted or
  YouTube/Vimeo), video gallery and watch pages, homepage's Featured
  Videos wired to real data, two-way cross-linking between a release and
  its related videos.
- **Phase 4 — Polish** ✅: RSS feed built from the Journal (`/rss.xml`,
  `/en/rss.xml`); a `Comments` page — a moderated static guestbook (see
  **Comments** below), replacing the old `Links` stub, which had nowhere
  to point yet anyway. Deliberately **not** doing per-release accent
  colors or a light theme — one dark theme, on brand, is the whole point.
