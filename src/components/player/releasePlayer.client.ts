// Client-side controller wiring one <ReleasePlayer> DOM instance to an
// AudioEngine, a WaveformView, and the Media Session bridge. Finds every
// [data-player] on the page (there's one per release page today) and sets
// each up independently — so this stays correct even if a future page ever
// embeds more than one.

import { AudioEngine } from '../../lib/player/engine';
import { WaveformView } from '../../lib/player/waveform';
import { bindMediaSession } from '../../lib/player/mediaSession';

interface QueueTrackData {
  title: string;
  src: string;
  duration?: number;
}

type RepeatMode = 'off' | 'all' | 'one';
const REPEAT_CYCLE: RepeatMode[] = ['off', 'all', 'one'];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function setupPlayer(root: HTMLElement) {
  const queueData: QueueTrackData[] = JSON.parse(root.dataset.queue || '[]');
  const releaseTitle = root.dataset.releaseTitle || '';
  const coverSrc = root.dataset.cover || '';

  const engine = new AudioEngine();
  engine.setQueue(queueData);

  const canvas = root.querySelector<HTMLCanvasElement>('[data-waveform-canvas]');
  const waveformWrap = root.querySelector<HTMLElement>('[data-waveform]');
  const waveform = canvas ? new WaveformView(canvas) : null;

  const playPauseBtn = root.querySelector<HTMLButtonElement>('[data-playpause]');
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-next]');
  const shuffleBtn = root.querySelector<HTMLButtonElement>('[data-shuffle]');
  const repeatBtn = root.querySelector<HTMLButtonElement>('[data-repeat]');
  const nowTitle = root.querySelector<HTMLElement>('[data-now-title]');
  const nowIndex = root.querySelector<HTMLElement>('[data-now-index]');
  const nowTime = root.querySelector<HTMLElement>('[data-now-time]');
  const trackRows = Array.from(root.querySelectorAll<HTMLElement>('[data-track-row]'));
  const trackPlayButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-track-play]')
  );

  function highlightRow(index: number | null) {
    for (const row of trackRows) {
      const isActive = index != null && Number(row.dataset.index) === index;
      row.classList.toggle('is-active', isActive);
    }
  }

  function updateNowPlaying(index: number | null) {
    if (index == null) return;
    const track = queueData[index];
    if (!track) return;
    if (nowTitle) nowTitle.textContent = track.title;
    if (nowIndex) {
      nowIndex.textContent = `${String(index + 1).padStart(2, '0')} / ${String(
        queueData.length
      ).padStart(2, '0')}`;
    }
    highlightRow(index);
    // Already-decoded tracks (e.g. switching back to one) show up
    // immediately; otherwise this is null until the 'waveform' event
    // below fires — decoding happens in the background, off the
    // playback path, so it can finish well after trackchange.
    waveform?.setBuffer(engine.getWaveformBuffer(index) ?? null);
  }

  function ensureStartedThen(action: () => void) {
    if (engine.getState().currentIndex == null) {
      engine.play(0, 0);
    } else {
      action();
    }
  }

  engine.on('trackchange', (e) => updateNowPlaying((e as CustomEvent).detail.index));
  engine.on('error', (e) => console.error('[player] track failed to load', (e as CustomEvent).detail));
  engine.on('waveform', (e) => {
    const { index, buffer } = (e as CustomEvent).detail;
    // Only apply if that track is still the one showing — decoding can
    // finish well after the user has already moved on to another track.
    if (engine.getState().currentIndex === index) waveform?.setBuffer(buffer);
  });

  engine.on('play', () => {
    playPauseBtn?.setAttribute('data-playing', 'true');
    playPauseBtn?.setAttribute('aria-label', playPauseBtn.dataset.labelPause || 'Pause');
  });

  engine.on('pause', () => {
    playPauseBtn?.setAttribute('data-playing', 'false');
    playPauseBtn?.setAttribute('aria-label', playPauseBtn.dataset.labelPlay || 'Play');
  });

  engine.on('loading', (e) => {
    const { loading } = (e as CustomEvent).detail;
    playPauseBtn?.setAttribute('data-loading', String(loading));
  });

  engine.on('timeupdate', (e) => {
    const { currentTime, duration } = (e as CustomEvent).detail;
    if (nowTime) nowTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    const fraction = duration > 0 ? currentTime / duration : 0;
    waveform?.setProgress(fraction);
    if (waveformWrap) {
      waveformWrap.setAttribute('aria-valuemax', String(Math.round(duration)));
      waveformWrap.setAttribute('aria-valuenow', String(Math.round(currentTime)));
    }
  });

  engine.on('ended', () => {
    highlightRow(null);
    // The engine stops playback internally (repeat off, last track), but
    // that isn't one of the 'play'/'pause' events — sync the button by hand
    // so it doesn't get stuck showing "playing" after the queue finishes.
    playPauseBtn?.setAttribute('data-playing', 'false');
    playPauseBtn?.setAttribute('aria-label', playPauseBtn.dataset.labelPlay || 'Play');
  });

  // Transport controls.
  playPauseBtn?.addEventListener('click', () => {
    if (engine.getState().currentIndex == null) engine.play(0, 0);
    else engine.toggle();
  });
  prevBtn?.addEventListener('click', () => ensureStartedThen(() => engine.prev()));
  nextBtn?.addEventListener('click', () => ensureStartedThen(() => engine.next()));

  shuffleBtn?.addEventListener('click', () => {
    const isOn = shuffleBtn.getAttribute('aria-pressed') === 'true';
    shuffleBtn.setAttribute('aria-pressed', String(!isOn));
    engine.setShuffle(!isOn);
  });

  repeatBtn?.addEventListener('click', () => {
    const current = (repeatBtn.dataset.mode as RepeatMode) || 'off';
    const next = REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(current) + 1) % REPEAT_CYCLE.length];
    repeatBtn.dataset.mode = next;
    repeatBtn.setAttribute(
      'aria-label',
      repeatBtn.dataset[`label${next[0].toUpperCase()}${next.slice(1)}`] || 'Repeat'
    );
    engine.setRepeat(next);
  });

  // Track list.
  for (const btn of trackPlayButtons) {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      if (engine.getState().currentIndex === index) engine.toggle();
      else engine.play(index, 0);
    });
  }

  // Waveform: click/tap to seek, and standard slider keyboard semantics
  // since it's marked role="slider" for the screen-reader/keyboard path.
  waveformWrap?.addEventListener('click', (e) => {
    if (!waveform) return;
    ensureStartedThen(() => {
      const fraction = waveform.fractionAtClientX((e as MouseEvent).clientX);
      const duration = engine.getDuration();
      if (duration > 0) engine.seek(fraction * duration);
    });
  });

  waveformWrap?.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key;
    if (key === 'ArrowRight') {
      e.preventDefault();
      engine.seekBy(5);
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      engine.seekBy(-5);
    } else if (key === 'Home') {
      e.preventDefault();
      engine.seek(0);
    } else if (key === 'End') {
      e.preventDefault();
      engine.seek(engine.getDuration());
    } else if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      playPauseBtn?.click();
    }
  });

  // Page-wide shortcuts, ignored while typing in a form field so they never
  // hijack normal text input.
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    if (waveformWrap && document.activeElement === waveformWrap) return; // has its own handler

    switch (e.key) {
      case ' ':
        e.preventDefault();
        playPauseBtn?.click();
        break;
      case '[':
        prevBtn?.click();
        break;
      case ']':
        nextBtn?.click();
        break;
      case 'ArrowRight':
        if (engine.getState().currentIndex != null) engine.seekBy(5);
        break;
      case 'ArrowLeft':
        if (engine.getState().currentIndex != null) engine.seekBy(-5);
        break;
    }
  });

  bindMediaSession(engine, (index) => {
    const track = queueData[index];
    if (!track) return null;
    return { title: track.title, releaseTitle, artworkSrc: coverSrc };
  });
}

export function initReleasePlayers() {
  document.querySelectorAll<HTMLElement>('[data-player]').forEach(setupPlayer);
}
