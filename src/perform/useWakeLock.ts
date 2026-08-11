import { useEffect, useState } from 'react';

/** How often to retry a lock we are not holding, in ms. */
const RETRY_MS = 30_000;

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

/** A sentence for the pedal screen. Not for the chart — see the note below. */
export function describeWake({ state, detail }: WakeStatus): string {
  switch (state) {
    case 'off':
      return 'Only requested in performance mode.';
    case 'held':
      return 'Held — the screen is being kept awake.';
    case 'lost':
      return 'Granted, then dropped by the system. Re-requested at every page turn.';
    case 'refused':
      return `Refused (${detail ?? 'unknown'}).`;
    case 'unsupported':
      return 'Not supported by this browser.';
  }
}

/**
 * Holds the screen awake while performance mode is on.
 *
 * Without this the iPad dims and sleeps partway through a song, since nothing
 * touches the screen between page turns.
 *
 * **iPadOS 16.4–16.7 grants the lock and then drops it on its own**, which is
 * why re-acquisition matters more here than the initial request. Confirmed on
 * the device 2026-08-11: entering performance mode reports `held`, the lock is
 * later released without us asking, and the screen sleeps if nothing prompts a
 * retry. A pedal press does prompt one, and a pedal-only run of several minutes
 * never slept — so on a real gig this holds. The re-request is refused straight
 * after a device unlock but succeeds on the next press.
 *
 * We keep asking through the standard API rather than resorting to the
 * hidden-looping-video trick: the code is correct against the spec, the cost of
 * being right is nothing, and a fixed iPadOS will simply start working. The
 * video would burn the compositor through every gig to cover a gap the pedal
 * already covers.
 *
 * Everywhere without the API this is a no-op rather than an error, because a
 * chart that still works beats a chart that refuses to load.
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
    // A request already in flight is not yet a sentinel, so without this a fast
    // double pedal press asks twice, is granted twice, and strands the first
    // lock untracked — leaving the screen awake after performance mode ends.
    let inFlight = false;

    const acquire = async () => {
      if (released || inFlight || (sentinel && !sentinel.released)) return;
      inFlight = true;
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
      } finally {
        inFlight = false;
      }
    };

    // iOS drops the lock whenever the app backgrounds — even briefly, such as
    // when a notification pulls focus — and never restores it on its own.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    // Any touch or key is both a chance to recover a dropped lock and a fresh
    // user gesture, which is what iOS wants before it will grant one again.
    const onGesture = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    // Covers the gap a page turn doesn't: a long instrumental, or a word with
    // the audience, where no press comes for minutes. Costs one rejected
    // promise every 30s in the cases where the OS will not play along.
    const retry = setInterval(() => void acquire(), RETRY_MS);

    return () => {
      released = true;
      clearInterval(retry);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      void sentinel?.release();
    };
  }, [active]);

  return status;
}
