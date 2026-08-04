# Sennóide

The official bilingual archive for Sennóide — an independent solo music
project active since 2021. Built as a static Astro site: no CMS, no
database, no third-party streaming embeds. Content lives in the repo as
text and media files; the site is the primary listening experience.

This repo is Phase 1 of a four-phase build. See **Roadmap** below.

## Stack

| Purpose    | Technology                                    |
| ---------- | ---------------------------------------------- |
| Framework  | Astro 7                                        |
| Language   | TypeScript                                     |
| Styling    | Tailwind CSS v4 (CSS-first, via `@theme`)      |
| i18n       | Astro's built-in i18n routing + a small dictionary in `src/lib/i18n.ts` |
| Fonts      | Space Grotesk, Inter, IBM Plex Mono — self-hosted via Fontsource |
| Icons      | lucide-static (raw SVG imports)                |
| Deployment | static output — Cloudflare Pages, Netlify, or Bunny.net |

No UI framework (React/Vue/etc.) is installed. The one interactive piece so
far — the mobile nav toggle — is a dozen lines of vanilla JS in `Nav.astro`.
Add a framework only when a feature genuinely needs client-side state that
a `<script>` tag can't reasonably handle (the audio player, later, might).

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
--color-bg:      #101010
--color-surface: #181818   (cards — not used yet, reserved for Phase 2 release/video cards)
--color-text:    #f3f3f3
--color-muted:   #9a9a9a
--color-border:  #2b2b2b
--color-accent:  #d6c3a1
```

Headings use Space Grotesk, body text uses Inter, and IBM Plex Mono is
reserved for technical/incidental detail — years, catalog numbers,
timestamps, kicker labels (see `.kicker` in `global.css`).

**Signature element:** the animated sine wave used as a section divider
(`src/components/SineDivider.astro`) is the one recurring motif on the
site — a literal sine wave, for a project named after one. It's built to
double conceptually as a stand-in for a waveform, ahead of the real audio
player in Phase 2.

## Folder structure

```
public/
  artwork/   audio/   photos/   video/   favicon/   ← media, add as you go
src/
  components/   Nav, Footer, SineDivider, EmptyState, StubPage
  layouts/      BaseLayout.astro — every page renders through this
  pages/        pt pages at the root, en/ pages mirror them 1:1
  lib/          i18n.ts — dictionary + language-switching helpers
  content/      releases/ journal/ pages/ — empty on purpose, see below
  styles/       global.css — tokens, fonts, base styles
```

`src/content/*` exists but is **not** wired up to a `content.config.ts`
yet — that schema (title, year, type, cover, tracks, credits, etc.) is
Phase 2 work, done alongside the release pages and audio player so the
schema is designed against real requirements instead of guessed at early.

## Before this goes live

A few things are intentionally left as placeholders and should be updated
before deploying:

- **`astro.config.mjs`** — `site: 'https://sennoide.com'` is a placeholder
  domain; update it to the real one (this feeds the sitemap and the
  canonical/hreflang tags in `BaseLayout.astro`).
- **About page copy** (`src/pages/about.astro` and `en/about.astro`) — a
  first draft based on what's known about the project. Worth a pass to
  make sure it sounds like you.
- **Homepage hero copy** — same idea, in `src/pages/index.astro` /
  `en/index.astro`.

## Roadmap

- **Phase 1 — Foundation** ✅ this repo: bilingual routing, global layout,
  navigation, dark theme, typography, responsive design, homepage, About
  page. `Music`, `Videos`, `Journal`, and `Links` exist in the nav but are
  intentionally simple "under construction" pages for now, so nothing
  404s while the rest gets built.
- **Phase 2 — Music Archive**: `content.config.ts` + release schema,
  release pages, the custom audio player, organizing releases by
  year/category, downloads and credits.
- **Phase 3 — Videos and Journal**: video gallery, journal/changelog,
  cross-linking between related works.
- **Phase 4 — Polish**: keyboard shortcuts, Media Session API, waveform
  visualization, artwork-driven accent colors, optional light theme, RSS.
