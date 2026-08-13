// Central translation dictionary for the site's UI chrome (nav, footer,
// buttons, empty states, metadata). Page *content* — release notes, journal
// entries, the About text — lives in its own files; this file is only for
// strings that repeat across the site or wrap around that content.
//
// Portuguese (pt) is the default/primary language and lives at "/".
// English (en) lives under "/en/". See astro.config.mjs for the routing.

import { stripBase, withBase } from './paths';

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
    'nav.comments': 'Comentários',
    'nav.menu.open': 'Abrir menu',
    'nav.menu.close': 'Fechar menu',
    'nav.language.switchTo': 'EN',
    'nav.language.current': 'Português',

    'home.kicker': 'Brasil · Desde 2021',
    'home.lead':
      'Composições, arranjos e vídeos feitos por conta própria, hospedados por conta própria.',
    'home.cta': 'Ouvir os novos arranjos',
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
      'Sennóide é um projeto musical solo, independente desde 2021, com sede em Recife, Brasil.',

    'comments.title': 'Comentários',
    'comments.intro':
      'Deixe seu comentário por e-mail. Leio e respondo aqui no mural.',
    'comments.cta': 'Enviar comentário',
    'comments.replyLabel': 'Sennóide respondeu',
    'comments.empty': 'Nenhum comentário publicado ainda.',

    'stub.badge': 'Em construção',
    'stub.body':
      'Esta seção ainda está sendo montada. Volte em breve para ver o conteúdo completo.',
    'stub.back': 'Voltar para a página inicial',

    'player.play': 'Tocar',
    'player.pause': 'Pausar',
    'player.previous': 'Faixa anterior',
    'player.next': 'Próxima faixa',
    'player.shuffle': 'Aleatório',
    'player.repeat.off': 'Repetição desligada — clique para repetir o álbum',
    'player.repeat.all': 'Repetindo o álbum — clique para repetir só a faixa',
    'player.repeat.one': 'Repetindo a faixa — clique para desligar',
    'player.seek': 'Progresso da faixa',
    'player.tracklist': 'Faixas',
    'player.downloads': 'Baixar',
    'player.shortcuts':
      'Atalhos: espaço tocar/pausar · ← → avançar/voltar 5s · [ ] faixa anterior/seguinte',
    'player.credits': 'Créditos',
    'player.relatedArrangement': 'Rearranjo de',
    'player.relatedOriginal': 'Composição original de',

    'release.back': 'Voltar para Música',
    'release.referencedBy': 'Rearranjo disponível',
    'release.prev': 'Trabalho anterior',
    'release.next': 'Trabalho seguinte',
    'release.type.album': 'Álbum',
    'release.type.ep': 'EP',
    'release.type.single': 'Single',
    'release.type.compilation': 'Coletânea',
    'release.type.ai-arrangement': 'Rearranjo com IA',
    'release.type.live': 'Ao vivo',
    'release.type.collaboration': 'Colaboração',
    'release.relatedVideos': 'Vídeos relacionados',

    'music.title': 'Música',
    'music.aiSection': 'Rearranjos com IA',
    'music.aiSectionNote':
      'Composições anteriores de Sennóide, reimaginadas com ferramentas de orquestração e arranjo assistidas por IA. As composições originais continuam inteiramente autorais.',
    'music.empty': 'Nenhum lançamento por aqui ainda.',

    'videos.title': 'Vídeos',
    'videos.empty': 'Nenhum vídeo por aqui ainda.',
    'video.watch': 'Assistir',
    'video.back': 'Voltar para Vídeos',
    'video.appearsOn': 'Faz parte de',
    'video.kind.visualizer': 'Visualizer',
    'video.kind.diy': 'Caseiro',
    'video.kind.live': 'Ao vivo',
    'video.kind.music-video': 'Videoclipe',
    'video.kind.other': 'Outros',

    'footer.selfHosted': 'Música original. Sem streaming, sem anúncios, sem rastreamento.',
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
    'nav.comments': 'Comments',
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
      'Sennóide is an independent solo music project, based in Recife – Brazil, active since 2021.',

    'comments.title': 'Comments',
    'comments.intro':
      "Leave your comment by email — I will read and reply here.",
    'comments.cta': 'Send a comment',
    'comments.replyLabel': 'Sennóide replied',
    'comments.empty': 'No comments published yet.',

    'stub.badge': 'Under construction',
    'stub.body':
      'This section is still being built. Check back soon for the full content.',
    'stub.back': 'Back to the homepage',

    'player.play': 'Play',
    'player.pause': 'Pause',
    'player.previous': 'Previous track',
    'player.next': 'Next track',
    'player.shuffle': 'Shuffle',
    'player.repeat.off': 'Repeat off — click to repeat the album',
    'player.repeat.all': 'Repeating the album — click to repeat just this track',
    'player.repeat.one': 'Repeating this track — click to turn off',
    'player.seek': 'Track progress',
    'player.tracklist': 'Tracklist',
    'player.downloads': 'Download',
    'player.shortcuts':
      'Shortcuts: space play/pause · ← → seek 5s · [ ] previous/next track',
    'player.credits': 'Credits',
    'player.relatedArrangement': 'Arrangement of',
    'player.relatedOriginal': 'Original composition by',

    'release.back': 'Back to Music',
    'release.referencedBy': 'Arrangement available',
    'release.prev': 'Earlier work',
    'release.next': 'Later work',
    'release.type.album': 'Album',
    'release.type.ep': 'EP',
    'release.type.single': 'Single',
    'release.type.compilation': 'Compilation',
    'release.type.ai-arrangement': 'AI Arrangement',
    'release.type.live': 'Live',
    'release.type.collaboration': 'Collaboration',
    'release.relatedVideos': 'Related videos',

    'music.title': 'Music',
    'music.aiSection': 'AI Arrangements',
    'music.aiSectionNote':
      'Earlier Sennóide compositions, reimagined with AI-assisted orchestration and arrangement tools. The original compositions remain entirely mine.',
    'music.empty': 'Nothing released here yet.',

    'videos.title': 'Videos',
    'videos.empty': 'Nothing here yet.',
    'video.watch': 'Watch',
    'video.back': 'Back to Videos',
    'video.appearsOn': 'Appears on',
    'video.kind.visualizer': 'Visualizer',
    'video.kind.diy': 'DIY',
    'video.kind.live': 'Live',
    'video.kind.music-video': 'Music Video',
    'video.kind.other': 'Other',

    'footer.selfHosted': 'Original music. No streaming, no ads, no tracking.',
    'footer.rights': 'All rights reserved.',

    '404.title': 'Page not found',
    '404.body': 'This page doesn\u2019t exist yet, or hasn\u2019t been built.',
  },
} as const;

export type UiKey = keyof (typeof ui)[typeof defaultLang];

/** Reads the active language from an Astro URL, e.g. new URL(Astro.url).
 *  Strips `base` first — url.pathname includes it (e.g.
 *  "/sennoide/en/about"), and without stripping it, the "en" segment
 *  would never land in the right position to be detected. */
export function getLangFromUrl(url: URL): Lang {
  const [, maybeLang] = stripBase(url.pathname).split('/');
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
 * to maintain as pages get added. `pathname` is expected in the form
 * Astro.url.pathname gives it (includes `base`); strip it before doing
 * prefix logic, then re-add it via withBase() on the way out.
 */
export function getLocalizedPath(pathname: string, targetLang: Lang): string {
  const withoutBase = stripBase(pathname);
  const withoutEnPrefix = withoutBase.replace(/^\/en(\/|$)/, '/');

  const result =
    targetLang === 'en'
      ? withoutEnPrefix === '/'
        ? '/en/'
        : `/en${withoutEnPrefix}`
      : withoutEnPrefix;

  return withBase(result);
}
