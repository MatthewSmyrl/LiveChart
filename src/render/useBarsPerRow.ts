import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The narrowest a bar may get, in chord-em.
 *
 * Measured against the widest bars the renderer actually produces: `Bbmaj9#11`
 * is 3.83em and `|Am  R  R |` in 6/8 is 3.88em, both including the bar's own
 * padding. 4em is the floor; below it the widest chords clip.
 */
export const MIN_BAR_EM = 4;

/**
 * The widest a bar may get, in chord-em.
 *
 * A bar wider than this makes a four-bar line sprawl the full width of the
 * iPad, and your eye has to travel the whole way for four chords. 5em holds the
 * bar at roughly the 204px that read well at gig distance before the type grew.
 */
export const MAX_BAR_EM = 5;

/**
 * Snap to a musically sensible row width so phrases don't wrap mid-figure.
 * Odd counts above 3 are avoided — a 5-across row reads as a mistake.
 */
export function snap(n: number): number {
  if (n >= 8) return 8;
  if (n >= 6) return 6;
  if (n >= 4) return 4;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

export interface BarPlan {
  /** Bar width in px. Every bar in the chart, on every row, gets this width. */
  barPx: number;
  /** Bars that fit on one row at that width. */
  capacity: number;
  /** Row width a line falls back to when it is too long to fit. */
  max: number;
}

/**
 * Picks one bar width for the whole chart.
 *
 * Bars stay uniform — that is what makes the grid scannable — but the width is
 * no longer a fixed multiple of the type size. It is the widest bar at which
 * the song's longest chord line still fits on a single row, clamped to
 * [MIN_BAR_EM, MAX_BAR_EM].
 *
 * The trade this encodes: wrapping a five-bar phrase into 4 + 1 costs far more
 * on stage than a slightly narrower bar does, while the space left over to the
 * right of a short line costs nothing at all — every chord line gets its own
 * row either way, so bar width buys legibility, never vertical density.
 */
export function planBars(width: number, chordPx: number, longestLine: number): BarPlan {
  // Before the first measurement — one frame at most. These are the numbers the
  // chart was hard-coded to before the width became adaptive.
  if (width <= 0) return { barPx: MAX_BAR_EM * chordPx, capacity: 4, max: 4 };

  const fitted = width / Math.max(longestLine, 1);
  const barPx = Math.min(MAX_BAR_EM * chordPx, Math.max(MIN_BAR_EM * chordPx, fitted));
  const capacity = Math.max(1, Math.floor(width / barPx));
  return { barPx, capacity, max: snap(capacity) };
}

/**
 * Measures the chart container and plans the bar grid from it.
 *
 * `longestLine` is the most bars on any one chord line in the song — the
 * constraint the bar width is fitted to.
 */
export function useBarsPerRow(chordPx: number, longestLine: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Measure synchronously first. Waiting on ResizeObserver's initial callback
    // leaves the chart rendering at the default column count until it fires —
    // and if the page never composites, it may not fire at all.
    const cs = getComputedStyle(el);
    const padding = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0');
    setWidth(el.clientWidth - padding);

    // contentRect already excludes padding, unlike clientWidth.
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? 0;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, ...planBars(width, chordPx, longestLine) };
}

/**
 * Columns for one chord line.
 *
 * A line that fits gets its own bar count, so this song's many 5-bar phrases
 * stay on one row rather than wrapping 4 + 1. Only lines too long to fit fall
 * back to the snapped width, where an odd count would read as a mistake.
 */
export function columnsFor(barCount: number, capacity: number, max: number): number {
  return barCount <= capacity ? Math.max(barCount, 1) : max;
}
