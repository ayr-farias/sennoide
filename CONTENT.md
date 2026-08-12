# Replacing placeholder content

Everything under `public/artwork/`, `public/audio/placeholder/`, and
`public/video/placeholder/` is generated placeholder — sine-tone audio,
generated SVG covers, a generated waveform video. This is a walkthrough for
swapping it for the real thing, and for rewriting the placeholder prose.
No terminal skills beyond editing a text file and running `npm run build`
are assumed.

Every release/journal/video is one Markdown file with a frontmatter block
(the `---`-fenced part at the top) — that's the only part you ever need to
edit. The blank body below the second `---` is unused; leave it empty.

## Replacing a release's artwork

1. Get your artwork file — a square image (e.g. `1400x1400`), `.jpg` or
   `.png`, works best. Put it in `public/artwork/`, e.g.
   `public/artwork/padroes-invisiveis.jpg`.
2. Open the release's file in `src/content/releases/` (e.g.
   `padroes-invisiveis.md`) and change the `cover:` line to point at it:
   ```yaml
   cover: /artwork/padroes-invisiveis.jpg
   ```
   (Path starts with `/artwork/...` — everything in `public/` is served
   from the site root, so `public/artwork/x.jpg` is `/artwork/x.jpg`.)
3. Update `coverAlt` (both `pt` and `en`) to actually describe the new
   image — it's read aloud by screen readers, so it should describe what's
   *in* the photo, not repeat the title.
4. You can now delete the old placeholder SVG for that release from
   `public/artwork/` if you like — nothing else references it.

## Replacing a release's audio

Each track has an `audio.src` — the file the player streams — and an
optional `audio.downloads` list for direct download links.

```yaml
tracks:
  - title: "Abertura"
    duration: 195              # real duration in seconds — update this
    audio:
      src: https://your-bunny-pull-zone.b-cdn.net/padroes-invisiveis/abertura.mp3
      downloads:
        - label: "FLAC"
          href: https://your-bunny-pull-zone.b-cdn.net/padroes-invisiveis/abertura.flac
        - label: "MP3 320"
          href: https://your-bunny-pull-zone.b-cdn.net/padroes-invisiveis/abertura.mp3
```

- `audio.src` can be a full `https://` URL (your Bunny.net pull zone) or a
  local path under `public/audio/` — either works, the player doesn't
  care. A real Bunny URL is the point of self-hosting, so that's the
  expected end state.
- `duration` is just what's shown in the tracklist *before* the file
  loads — the player always uses the real decoded length once it starts
  playing, so an approximate number here is fine, but exact is nicer.
- `downloads` is a plain list — add as many or as few as you want, and
  the `label` is whatever text you want on the button (it doesn't have to
  say "FLAC"/"MP3"; say what the file actually is).
- Once every track for a release points at real files, delete that
  release's folder under `public/audio/placeholder/`.

## Replacing or adding a video

Video files in `src/content/videos/` have a `source` field with three
possible shapes — pick one:

```yaml
# A file you host yourself (Bunny.net or public/video/):
source:
  type: self-hosted
  src: https://your-pull-zone.b-cdn.net/videos/live-session.mp4

# A YouTube video (the ID is the part after ?v= in the URL):
source:
  type: youtube
  id: dQw4w9WgXcQ

# A Vimeo video (the ID is the number in the URL):
source:
  type: vimeo
  id: 123456789
```

Also set `thumbnail` (a `.jpg`/`.png`/`.svg` under `public/video/` or a
full URL), `kind` (`visualizer`, `diy`, or `live`), `year`, `runtime` (in
seconds), and `description` (`pt` + `en`). To link a video to the release
it belongs to, add its filename (without `.md`) to that release's
`relatedVideos` list — the release page picks up the reverse link
automatically, you don't need to edit anything on the video's side.

To add a **new** video rather than replace one: copy an existing file in
`src/content/videos/`, rename it (the filename becomes the URL slug, e.g.
`my-video.md` → `/videos/my-video`), and fill in its frontmatter.

Once you have real `diy`/`live` videos, the two placeholder visualizers in
`src/content/videos/` and their files in `public/video/placeholder/` can
be deleted (or kept — they're harmless, just clearly generated).

## Publishing a fan comment

The `/comments` page is a moderated static guestbook, not a live comment
system — there's no submission backend. When a fan emails a comment in
(via the mailto link on the page), publishing it means adding a file
yourself to `src/content/comments/`:

```yaml
# src/content/comments/2026-03-01-maria.md
---
name: "Maria"
date: 2026-03-01
message: "Amei o rearranjo de Rotina! A versão nova tem outra atmosfera."
---
```

The filename can be anything (it's never shown or linked to) — a
date-plus-name pattern like the example just keeps the folder sorted and
readable. To reply publicly, add a `reply`:

```yaml
---
name: "Maria"
date: 2026-03-01
message: "Amei o rearranjo de Rotina! A versão nova tem outra atmosfera."
reply:
  date: 2026-03-02
  message: "Obrigado! Foi o que eu mais queria explorar nessa versão."
---
```

`message` and `reply.message` are single strings, not `pt`/`en` pairs —
write them in whichever language the fan (or you) actually used; they
show up as-is on both language versions of the page. Set `draft: true` if
you want to stage a comment in the repo without publishing it yet.

## Adding a new release or journal entry

Copy the closest existing file in `src/content/releases/` or
`src/content/journal/`, rename it, and edit the frontmatter — every field
is documented with an example in the README's **Content model** section.
A release's filename becomes its URL slug and its position in
`relatedReleases`/`relatedVideos` elsewhere, so pick it once and avoid
renaming later (it'd break any links pointing at it).

## Rewriting the About page

`src/pages/about.astro` (Portuguese) and `src/pages/en/about.astro`
(English). The five sections (Project, Music, DIY Production, AI
Experiments, Current Work) are the `sections` array near the top of each
file's frontmatter block — edit the `heading`/`body` text directly there.
The two files are independent (About is one of the few pages *not* pulled
into a shared component), so **remember to update both languages**.

## Rewriting the homepage

Homepage copy lives in `src/components/HomePage.astro` (shared by both
`src/pages/index.astro` and `src/pages/en/index.astro` — edit this one
file and both languages update):

- **Hero tagline / CTA / AI note** — these are `t('home.lead')`,
  `t('home.cta')`, `t('home.aiNote')` etc.; the actual text lives in
  `src/lib/i18n.ts` under the matching keys (`'home.lead'`, `'home.cta'`,
  ...) — one for `pt`, one for `en`.
- **About teaser paragraph** — the `aboutTeaser` variable near the top of
  `HomePage.astro`'s frontmatter, already split `pt`/`en`.

Most short, repeated UI strings (nav labels, button text, empty-state
messages) live the same way in `src/lib/i18n.ts` — search for the English
text you want to change, and edit the `pt`/`en` pair together.

## After you're done

- Run `npm run build` — it'll fail loudly (with a file/line number) if
  any frontmatter is malformed, so it doubles as a check that you didn't
  typo a YAML field.
- Run `npm run dev` and click through the changed pages before shipping.
- See the README's **Before this goes live** section for the remaining
  non-content items (production domain, etc.).
