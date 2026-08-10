import { useCallback, useEffect, useRef, useState } from 'react';
import { actionFor, type Bindings } from './keymap';
import { planScroll, type Direction, type GroupBox } from './scrollPlan';

/** How long the "press again" confirmation stays armed. */
const END_ARM_MS = 4000;
/** How long a transient on-screen notice stays up. */
const NOTICE_MS = 2200;

export interface PerformanceOptions {
  /** Fraction of the viewport one press travels: 0.5, 0.75 or 1. */
  fraction: number;
  bindings: Bindings;
  /** Keys are passed through untouched while true — the learn screen wants them raw. */
  suspended: boolean;
  /** The confirming press at the end of the song. Phase 5 hangs setlists here. */
  onEnd?: () => void;
}

export interface PerformanceApi {
  /** Turn the page. Shared by the pedal, the tap zones and the toolbar. */
  turn: (direction: Direction) => void;
  /** Transient message for the on-screen hint, or null. */
  notice: string | null;
}

/** Document-space extent of every group, in document order. */
function readGroups(): GroupBox[] {
  const y = window.scrollY;
  return Array.from(document.querySelectorAll<HTMLElement>('[data-group]'), (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + y), bottom: Math.round(r.bottom + y) };
  });
}

/**
 * Height of the sticky chrome overlaying the top of the viewport, so a snapped
 * group lands below it rather than behind it. Measured rather than assumed:
 * the header scales with the font size, and the toolbar comes and goes.
 */
function measureTopInset(): number {
  let inset = 0;
  for (const selector of ['.toolbar', '.section__header']) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
    // The toolbar keeps its fixed position while hidden so it can slide back in.
    if (parseFloat(cs.opacity) === 0) continue;
    // Where the element comes to rest, not where it happens to be right now: at
    // the top of the song a section header is still down in the flow, and
    // measuring that would push every landing point most of a screen too far.
    inset = Math.max(inset, (parseFloat(cs.top) || 0) + el.getBoundingClientRect().height);
  }
  return inset;
}

export function usePerformance({
  fraction,
  bindings,
  suspended,
  onEnd,
}: PerformanceOptions): PerformanceApi {
  const [notice, setNotice] = useState<string | null>(null);
  const endArmedAt = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Target of a smooth scroll still in flight, or null. */
  const pendingTop = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const say = useCallback((message: string | null) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    if (message !== null) noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(noticeTimer.current);
      clearTimeout(settleTimer.current);
    },
    [],
  );

  // Once the player scrolls by hand, whatever we were animating towards is no
  // longer where they want to be. A plain tap is not a takeover — it has to
  // move — otherwise a quick double-tap on the advance zone would lose its
  // pending target and under-travel.
  useEffect(() => {
    const drop = () => {
      pendingTop.current = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 0) drop();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('wheel', drop, { passive: true });
    window.addEventListener('scrollend', drop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('wheel', drop);
      window.removeEventListener('scrollend', drop);
    };
  }, []);

  const turn = useCallback(
    (direction: Direction) => {
      const plan = planScroll(
        {
          // Two quick pedal presses arrive while the first scroll is still
          // animating, when `scrollY` is somewhere in the middle. Measuring from
          // the target instead means the second press travels a full step rather
          // than a fraction of one.
          scrollTop: pendingTop.current ?? window.scrollY,
          viewportH: window.innerHeight,
          maxScroll: document.documentElement.scrollHeight - window.innerHeight,
          fraction,
          groups: readGroups(),
          topInset: measureTopInset(),
        },
        direction,
      );

      if (plan.kind === 'edge') {
        if (direction === 'back') {
          endArmedAt.current = 0;
          say('Top of song');
          return;
        }
        // Second press required past the end: a stray tap or a pedal bounce
        // must not skip to the next song in the middle of a held last chord.
        if (Date.now() - endArmedAt.current < END_ARM_MS) {
          endArmedAt.current = 0;
          say(null);
          onEnd?.();
        } else {
          endArmedAt.current = Date.now();
          say('End of song — press again');
        }
        return;
      }

      endArmedAt.current = 0;
      const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: plan.top, behavior: instant ? 'auto' : 'smooth' });

      pendingTop.current = instant ? null : plan.top;
      // `scrollend` clears this normally; the timeout covers browsers without it
      // and animations that never finish, so a stale target can't strand a press.
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        pendingTop.current = null;
      }, 900);
    },
    [fraction, onEnd, say],
  );

  // Held in a ref so the listener registers once and never misses a press
  // during a re-render.
  const latest = useRef({ bindings, suspended, turn });
  latest.current = { bindings, suspended, turn };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { bindings: b, suspended: off, turn: go } = latest.current;
      if (off) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) {
        return;
      }
      const direction = actionFor(b, event);
      if (!direction) return;
      // Otherwise Space and PageDown scroll natively as well, doubling the turn.
      event.preventDefault();
      // A pedal sending Space would otherwise re-fire whichever toolbar button
      // was last tapped, because that button still holds focus.
      if (target?.tagName === 'BUTTON') target.blur();
      go(direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { turn, notice };
}
