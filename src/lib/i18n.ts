// Central translation dictionary for the site's UI chrome (nav, footer,
// buttons, empty states, metadata). Page *content* — release notes, journal
// entries, the About text — lives in its own files; this file is only for
// strings that repeat across the site or wrap around that content.
//
// Portuguese (pt) is the default/primary language and lives at "/".
// English (en) lives under "/en/". See astro.config.mjs for the routing.

export const defaultLang = 'pt' as const;

export const languages = {
  pt: 'Português',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const ui = {
  pt: {
    'site.name': 'Sennóide',
    'site.tagline': 'Projeto musical independente',
    'site.description':
      'Sennóide é um projeto musical solo e independente, ativo desde 2021. Álbuns, EPs, singles, vídeos e rearranjos com IA, todos autogeridos.',

    'nav.music': 'Música',
    'nav.videos': 'Vídeos',
    'nav.journal': 'Diário',
    'nav.about': 'Sobre',
    'nav.links': 'Links',
    'nav.menu.open': 'Abrir menu',
    'nav.menu.close': 'Fechar menu',
    'nav.language.switchTo': 'EN',
    'nav.language.current': 'Português',

    'home.kicker': 'Brasil · Desde 2021',
    'home.lead':
      'Composições, rearranjos e vídeos feitos por conta própria, hospedados por conta própria.',
    'home.cta': 'Ouvir os novos rearranjos',
    'home.aiNote':
      'Novas versões de músicas antigas, reimaginadas com ferramentas de IA.',

    'section.releases.label': 'Últimos lançamentos',
    'section.releases.empty':
      'O arquivo está sendo montado. Os primeiros lançamentos aparecem aqui em breve.',
    'section.videos.label': 'Vídeos em destaque',
    'section.videos.empty':
      'Os vídeos — ao vivo, caseiros e visualizers — vão aparecer aqui em breve.',
    'section.journal.label': 'Diário',
    'section.journal.empty':
      'Atualizações curtas sobre o que está sendo feito vão aparecer aqui.',
    'section.about.label': 'Sobre',
    'section.about.cta': 'Ler mais',

    'about.title': 'Sobre',
    'about.intro':
      'Sennóide é um projeto musical solo, independente desde 2021, com sede no Brasil.',

    'links.title': 'Links',
    'links.empty': 'Esta página está em construção.',

    'stub.badge': 'Em construção',
    'stub.body':
      'Esta seção ainda está sendo montada. Volte em breve para ver o conteúdo completo.',
    'stub.back': 'Voltar para a página inicial',

    'footer.selfHosted': 'Música autogerida. Sem streaming, sem anúncios, sem rastreamento.',
    'footer.rights': 'Todos os direitos reservados.',

    '404.title': 'Página não encontrada',
    '404.body': 'Essa página não existe, ou ainda não foi construída.',
  },
  en: {
    'site.name': 'Sennóide',
    'site.tagline': 'Independent music project',
    'site.description':
      'Sennóide is an independent solo music project, active since 2021. Albums, EPs, singles, videos, and AI arrangements, entirely self-hosted.',

    'nav.music': 'Music',
    'nav.videos': 'Videos',
    'nav.journal': 'Journal',
    'nav.about': 'About',
    'nav.links': 'Links',
    'nav.menu.open': 'Open menu',
    'nav.menu.close': 'Close menu',
    'nav.language.switchTo': 'PT',
    'nav.language.current': 'English',

    'home.kicker': 'Brazil · Since 2021',
    'home.lead':
      'Self-written, self-recorded, self-hosted — songs, arrangements, and video.',
    'home.cta': 'Listen to the new arrangements',
    'home.aiNote':
      'New versions of older songs, reinterpreted with AI-assisted tools.',

    'section.releases.label': 'Latest releases',
    'section.releases.empty':
      'The archive is still being built. The first releases will land here soon.',
    'section.videos.label': 'Featured videos',
    'section.videos.empty':
      'Live footage, DIY videos, and visualizers will show up here soon.',
    'section.journal.label': 'Journal',
    'section.journal.empty':
      'Short updates on what\u2019s being worked on will appear here.',
    'section.about.label': 'About',
    'section.about.cta': 'Read more',

    'about.title': 'About',
    'about.intro':
      'Sennóide is an independent solo music project, based in Brazil, active since 2021.',

    'links.title': 'Links',
    'links.empty': 'This page is under construction.',

    'stub.badge': 'Under construction',
    'stub.body':
      'This section is still being built. Check back soon for the full content.',
    'stub.back': 'Back to the homepage',

    'footer.selfHosted': 'Self-hosted music. No streaming, no ads, no tracking.',
    'footer.rights': 'All rights reserved.',

    '404.title': 'Page not found',
    '404.body': 'This page doesn\u2019t exist yet, or hasn\u2019t been built.',
  },
} as const;

export type UiKey = keyof (typeof ui)[typeof defaultLang];

/** Reads the active language from an Astro URL, e.g. new URL(Astro.url). */
export function getLangFromUrl(url: URL): Lang {
  const [, maybeLang] = url.pathname.split('/');
  if (maybeLang === 'en') return 'en';
  return defaultLang;
}

/** Returns a t() function bound to the given language. */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/**
 * Given the current pathname and a target language, returns the equivalent
 * path in that language. Both languages use the same slugs (e.g. "/about"
 * and "/en/about"), so switching is a pure prefix swap — no lookup table
 * to maintain as pages get added.
 */
export function getLocalizedPath(pathname: string, targetLang: Lang): string {
  const withoutEnPrefix = pathname.replace(/^\/en(\/|$)/, '/');

  if (targetLang === 'en') {
    return withoutEnPrefix === '/' ? '/en/' : `/en${withoutEnPrefix}`;
  }

  return withoutEnPrefix;
}
