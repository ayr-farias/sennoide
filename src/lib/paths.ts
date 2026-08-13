// astro.config.mjs sets `base: "/sennoide"` (the site deploys under a
// GitHub Pages project path, not the domain root). Astro only prepends
// that base automatically to URLs it generates itself (Astro.url,
// getStaticPaths-driven routes, etc.) — a plain hardcoded string like
// `href="/music"` or a content field like a release's `cover` path is
// never touched. Every such string in this codebase needs to go through
// withBase() (or stripBase() on the way in) or it silently 404s the
// moment `base` is anything other than "/".

/** Trailing-slash-normalized `base`, e.g. "/sennoide" or "" (root). */
function trimmedBase(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Has a URL scheme (https:, mailto:, etc.) or is protocol-relative —
 *  i.e. it's an external URL, not a path on this site, and must be left
 *  alone. Content fields like a release's audio.src are sometimes a full
 *  Bunny.net URL and sometimes a local /public path; this is what lets
 *  withBase() handle both without the caller needing to know which. */
function isExternal(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//');
}

/** Prefixes a site-relative path (starting with "/") with the configured
 *  base. External URLs pass through unchanged. */
export function withBase(path: string): string {
  if (isExternal(path)) return path;
  const base = trimmedBase();
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

/** Strips the configured base off a pathname that already includes it
 *  (e.g. from Astro.url.pathname), so code that reasons about routes in
 *  base-relative terms — language detection, the language switcher — can
 *  work the same regardless of what `base` is set to. */
export function stripBase(pathname: string): string {
  const base = trimmedBase();
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || '/';
  }
  return pathname;
}
