// Wires the engine up to the Media Session API so phone lock screens and
// desktop OS media controls (headphone buttons, notification widgets) show
// the current track and can drive playback without the tab being focused.
// A no-op everywhere the API doesn't exist — nothing here is load-bearing
// for the player to function.

import type { AudioEngine } from './engine';

export interface MediaSessionTrackMeta {
  title: string;
  releaseTitle: string;
  artworkSrc?: string;
}

export function bindMediaSession(
  engine: AudioEngine,
  getTrackMeta: (index: number) => MediaSessionTrackMeta | null
) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return () => {};

  const ms = navigator.mediaSession;

  const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => engine.resume()],
    ['pause', () => engine.pause()],
    ['previoustrack', () => engine.prev()],
    ['nexttrack', () => engine.next()],
    ['seekbackward', (d) => engine.seekBy(-(d.seekOffset || 10))],
    ['seekforward', (d) => engine.seekBy(d.seekOffset || 10)],
    ['seekto', (d) => {
      if (d.seekTime != null) engine.seek(d.seekTime);
    }],
  ];

  for (const [action, handler] of actions) {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // Action not supported by this browser — skip it.
    }
  }

  function updateMetadata() {
    const state = engine.getState();
    if (state.currentIndex == null) return;
    const meta = getTrackMeta(state.currentIndex);
    if (!meta) return;

    ms.metadata = new MediaMetadata({
      title: meta.title,
      artist: 'Sennóide',
      album: meta.releaseTitle,
      artwork: meta.artworkSrc
        ? [{ src: meta.artworkSrc, sizes: '800x800', type: 'image/svg+xml' }]
        : [],
    });
  }

  function updatePlaybackState() {
    ms.playbackState = engine.getState().playing ? 'playing' : 'paused';
  }

  function updatePositionState() {
    const state = engine.getState();
    if (!state.duration || Number.isNaN(state.duration)) return;
    try {
      ms.setPositionState({
        duration: state.duration,
        playbackRate: 1,
        position: Math.min(state.currentTime, state.duration),
      });
    } catch {
      // Some browsers throw if position > duration by float error — ignore.
    }
  }

  const onTrackChange = () => {
    updateMetadata();
    updatePositionState();
  };
  const onPlay = () => updatePlaybackState();
  const onPause = () => updatePlaybackState();

  // Position state only needs coarse updates — the OS extrapolates between
  // calls using playbackRate, so once a second is plenty.
  const positionInterval = setInterval(() => {
    if (engine.getState().playing) updatePositionState();
  }, 1000);

  engine.on('trackchange', onTrackChange);
  engine.on('play', onPlay);
  engine.on('pause', onPause);

  return () => {
    clearInterval(positionInterval);
    engine.off('trackchange', onTrackChange);
    engine.off('play', onPlay);
    engine.off('pause', onPause);
  };
}
