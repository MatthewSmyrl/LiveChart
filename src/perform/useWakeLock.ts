import { useEffect, useState } from 'react';

/**
 * What the screen is actually doing, as opposed to what we asked for.
 *
 * - `off` — performance mode is not on, so nothing was requested.
 * - `held` — the OS granted the lock and still holds it.
 * - `lost` — it was granted and then released by the system behind our back.
 * - `refused` — the request was rejected. `detail` carries the error name.
 * - `unsupported` — no Screen Wake Lock API on this browser.
 */
export type WakeState = 'off' | 'held' | 'lost' | 'refused' | 'unsupported';

export interface WakeStatus {
  state: WakeState;
  /** Error name from a refused request, e.g. `NotAllowedError`. */
  detail?: string;
}

/** Short enough for the toolbar, specific enough to diagnose from. */
export function describeWake({ state, detail }: WakeStatus): string | null {
  switch (state) {
    case 'off':
      return null;
    case 'held':
      return 'Awake';
    case 'lost':
      return 'Sleeps: lock lost';
    case 'refused':
      return `Sleeps: ${detail ?? 'refused'}`;
    case 'unsupported':
      return 'Sleeps: unsupported';
  }
}

/**
 * Holds the screen awake while performance mode is on, and reports whether it
 * actually managed it.
 *
 * Without this the iPad dims and sleeps partway through a song, since nothing
 * touches the screen between page turns. Safari has supported it since 16.4;
 * everywhere else this is a no-op rather than an error, because a chart that
 * still works beats a chart that refuses to load.
 *
 * The status is returned rather than swallowed because a silent failure is the
 * worst outcome on stage: the screen goes black mid-song and there is nothing
 * to tell you it was ever going to. Whatever this reports is the truth about
 * what the OS granted — it cannot tell you the OS then ignored its own grant.
 */
export function useWakeLock(active: boolean): WakeStatus {
  const [status, setStatus] = useState<WakeStatus>({ state: 'off' });

  useEffect(() => {
    if (!active) {
      setStatus({ state: 'off' });
      return;
    }
    if (!('wakeLock' in navigator)) {
      setStatus({ state: 'unsupported' });
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      if (released || (sentinel && !sentinel.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        // The effect may have torn down while the request was in flight.
        if (released) {
          void next.release();
          return;
        }
        sentinel = next;
        // The only honest signal that the screen is no longer being held: iOS
        // drops the lock on its own and the sentinel is all that says so.
        next.addEventListener('release', () => {
          if (!released && sentinel === next) setStatus({ state: 'lost' });
        });
        setStatus({ state: 'held' });
      } catch (error) {
        setStatus({
          state: 'refused',
          detail: error instanceof Error ? error.name : 'unknown',
        });
      }
    };

    // iOS drops the lock whenever the app backgrounds — even briefly, such as
    // when a notification pulls focus — and never restores it on its own.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    // Any touch is both a chance to recover a dropped lock and a fresh user
    // gesture, which is what some engines want before they will grant one.
    const onGesture = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      void sentinel?.release();
    };
  }, [active]);

  return status;
}
