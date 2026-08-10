import { useEffect } from 'react';

/**
 * Holds the screen awake while performance mode is on.
 *
 * Without this the iPad dims and sleeps partway through a song, since nothing
 * touches the screen between page turns. Safari has supported it since 16.4;
 * everywhere else this is a no-op rather than an error, because a chart that
 * still works beats a chart that refuses to load.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request('screen');
        // The effect may have torn down while the request was in flight.
        if (released) void next.release();
        else sentinel = next;
      } catch {
        /* Low battery or a background tab. Nothing useful to say on stage. */
      }
    };

    // iOS drops the lock whenever the app backgrounds — even briefly, such as
    // when a notification pulls focus — and never restores it on its own.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
    };
  }, [active]);
}
