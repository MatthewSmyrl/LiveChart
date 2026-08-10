/**
 * Page-turn arithmetic for performance mode.
 *
 * Kept pure and DOM-free so the rules that matter on stage can be tested
 * directly: a press must always move, must never separate a chord line from its
 * lyrics, and must never silently run off the end of the song.
 */

export type Direction = 'forward' | 'back';

/** How far a boundary may sit from the ideal landing point and still win. */
export const SNAP_TOLERANCE = 0.15;

/** Scroll positions are fractional; treat sub-pixel differences as equal. */
const EPSILON = 1;

/** Document-space extent of one `[data-group]` — a chord line with its lyrics. */
export interface GroupBox {
  top: number;
  bottom: number;
}

export interface ScrollContext {
  /** Current document scroll offset. */
  scrollTop: number;
  /** Visible height, including the area behind the sticky chrome. */
  viewportH: number;
  /** Largest scrollable offset — document height minus viewport height. */
  maxScroll: number;
  /** Fraction of the viewport a single press travels: 0.5, 0.75 or 1. */
  fraction: number;
  /** Every `[data-group]`, in document order. */
  groups: GroupBox[];
  /** Height of sticky chrome overlaying the top of the viewport. */
  topInset: number;
}

export type ScrollPlan =
  | { kind: 'scroll'; top: number; snapped: boolean }
  /** Already hard against the end in that direction; nothing left to scroll. */
  | { kind: 'edge' };

/**
 * Nearest candidate to `ideal` within `tolerance`, or null.
 *
 * Ties go to the earlier candidate: undershooting shows a line twice, which is
 * merely untidy, while overshooting hides one, which loses your place.
 */
function nearest(candidates: number[], ideal: number, tolerance: number): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const d = Math.abs(c - ideal);
    if (d <= tolerance && d < bestDistance) {
      best = c;
      bestDistance = d;
    }
  }
  return best;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * The furthest a forward turn may land without losing content.
 *
 * A group is a chord line and the lyrics that belong under it. If the current
 * screen cuts one off at the bottom, the next screen has to start at that
 * group's top — scrolling past it would show those lyrics never, or show them
 * with their chords already gone, which is worse than showing them twice.
 *
 * At 100% the ideal landing point sits exactly on the fold, so this binds
 * whenever a group straddles it. At 50% and 75% the ideal is well inside the
 * screen, so it only binds for a group taller than the leftover quarter.
 *
 * `Infinity` when nothing needs protecting.
 */
function forwardCap(ctx: ScrollContext): number {
  const fold = ctx.scrollTop + ctx.viewportH;
  const visibleTop = ctx.scrollTop + ctx.topInset;

  for (const group of ctx.groups) {
    if (group.bottom <= fold) continue; // Already shown in full.
    const landing = group.top - ctx.topInset;
    // A group taller than the screen cannot be rescued by stopping short, and
    // capping to it would leave the press with nowhere to go.
    if (group.top < visibleTop || landing <= ctx.scrollTop) return Infinity;
    return landing;
  }
  return Infinity;
}

/**
 * Where a single pedal press should land.
 *
 * The ideal landing point is a fraction of the viewport away. If a group
 * boundary sits close to it, the boundary wins, so the press lands with a chord
 * line flush below the sticky headers rather than clipping through one.
 *
 * A forward turn is then held back to `forwardCap`, so it can undershoot the
 * requested fraction but never overshoot a group the screen was already
 * cutting off. That makes "100%" occasionally less than a full screen, which is
 * the right trade: a page turn that skips a couplet costs you your place.
 *
 * With the smallest step at 50% of the viewport and the tolerance at 15%, a
 * snapped forward target is always ahead of where you were — a press can never
 * feel dead.
 */
export function planScroll(ctx: ScrollContext, direction: Direction): ScrollPlan {
  const limit = Math.max(0, ctx.maxScroll);
  const atEdge =
    direction === 'forward' ? ctx.scrollTop >= limit - EPSILON : ctx.scrollTop <= EPSILON;
  if (atEdge) return { kind: 'edge' };

  const step = ctx.viewportH * ctx.fraction;
  const ideal = direction === 'forward' ? ctx.scrollTop + step : ctx.scrollTop - step;

  // A group's top edge must clear the sticky chrome, not hide behind it.
  const landings = ctx.groups.map((g) => g.top - ctx.topInset);
  const boundary = nearest(landings, ideal, ctx.viewportH * SNAP_TOLERANCE);

  if (direction === 'back') {
    return {
      kind: 'scroll',
      top: clamp(boundary ?? ideal, 0, limit),
      snapped: boundary !== null,
    };
  }

  const cap = forwardCap(ctx);
  const wanted = boundary ?? ideal;
  const held = wanted > cap;

  return {
    kind: 'scroll',
    top: clamp(held ? cap : wanted, 0, limit),
    // Being held back lands on a group top too, so the press still comes to
    // rest on a boundary rather than mid-phrase.
    snapped: held || boundary !== null,
  };
}
