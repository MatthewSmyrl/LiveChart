import { describe, expect, it } from 'vitest';
import { planScroll, type GroupBox, type ScrollContext } from './scrollPlan';

/** 1000px viewport, 5000px of scroll, no sticky chrome unless a test adds it. */
function ctx(over: Partial<ScrollContext> = {}): ScrollContext {
  return {
    scrollTop: 0,
    viewportH: 1000,
    maxScroll: 5000,
    fraction: 0.75,
    groups: [],
    topInset: 0,
    ...over,
  };
}

/**
 * Groups at the given tops, each a typical chord line plus two lyric lines.
 * Short enough that the forward cap does not bite unless a test means it to.
 */
function at(...tops: number[]): GroupBox[] {
  return tops.map((top) => ({ top, bottom: top + 120 }));
}

describe('planScroll — travel', () => {
  it('advances by the configured fraction of the viewport', () => {
    expect(planScroll(ctx({ scrollTop: 1000, fraction: 0.5 }), 'forward')).toEqual({
      kind: 'scroll',
      top: 1500,
      snapped: false,
    });
    expect(planScroll(ctx({ scrollTop: 1000, fraction: 0.75 }), 'forward')).toEqual({
      kind: 'scroll',
      top: 1750,
      snapped: false,
    });
    expect(planScroll(ctx({ scrollTop: 1000, fraction: 1 }), 'forward')).toEqual({
      kind: 'scroll',
      top: 2000,
      snapped: false,
    });
  });

  it('retreats by the same fraction', () => {
    expect(planScroll(ctx({ scrollTop: 2000, fraction: 0.75 }), 'back')).toEqual({
      kind: 'scroll',
      top: 1250,
      snapped: false,
    });
  });
});

describe('planScroll — group snapping', () => {
  it('snaps to a group boundary near the landing point', () => {
    // Ideal is 750; the boundary at 800 is 50px away, well inside the 150px window.
    const plan = planScroll(ctx({ groups: at(400, 800, 1600) }), 'forward');
    expect(plan).toEqual({ kind: 'scroll', top: 800, snapped: true });
  });

  it('leaves the landing point alone when no boundary is close enough', () => {
    // Nearest boundary to 750 is 560, 190px away — outside the 150px window.
    const plan = planScroll(ctx({ groups: at(560, 1600) }), 'forward');
    expect(plan).toEqual({ kind: 'scroll', top: 750, snapped: false });
  });

  it('offsets the boundary so the group clears the sticky chrome', () => {
    // The group's top edge is at 860; with 60px of chrome overlaying the
    // viewport, we must stop at 800 for it to be visible.
    const plan = planScroll(ctx({ groups: at(860), topInset: 60 }), 'forward');
    expect(plan).toEqual({ kind: 'scroll', top: 800, snapped: true });
  });

  it('prefers the nearer of two candidate boundaries', () => {
    expect(planScroll(ctx({ groups: at(700, 880) }), 'forward')).toMatchObject({ top: 700 });
    expect(planScroll(ctx({ groups: at(620, 780) }), 'forward')).toMatchObject({ top: 780 });
  });

  it('breaks a tie by undershooting, so no line is skipped', () => {
    // 650 and 850 are both 100px from the ideal 750. Showing a line twice beats
    // hiding one.
    expect(planScroll(ctx({ groups: at(650, 850) }), 'forward')).toMatchObject({ top: 650 });
  });

  it('snaps when retreating too', () => {
    // From 2000 the ideal is 1250; the boundary at 1300 wins.
    const plan = planScroll(ctx({ scrollTop: 2000, groups: at(1300, 2400) }), 'back');
    expect(plan).toEqual({ kind: 'scroll', top: 1300, snapped: true });
  });

  it('always moves forward, even when boundaries cluster behind the ideal', () => {
    // The smallest step is 50% of the viewport and the window is 15%, so a
    // snapped target can never land at or behind where the press started.
    const plan = planScroll(
      ctx({ scrollTop: 1000, fraction: 0.5, groups: at(900, 1000, 1050, 1400) }),
      'forward',
    );
    expect(plan.kind).toBe('scroll');
    if (plan.kind === 'scroll') expect(plan.top).toBeGreaterThan(1000);
  });
});

describe('planScroll — never scrolling past a cut-off group', () => {
  // Reported from a desktop Firefox run-through: at 100% a group whose lyrics
  // were cut off at the bottom got jumped over entirely, so those lines were
  // never read — and by the time they would have been, their chord line was
  // already off the top.
  const straddling = [
    { top: 880, bottom: 1060 }, // cut off by the fold at 1000
    { top: 1080, bottom: 1200 },
  ];

  it('holds a 100% turn back to the top of the group the screen was cutting off', () => {
    // The ideal lands on the fold at 1000. The next group's top is nearer
    // (80px vs 120px), so nearest-boundary snapping used to jump straight past
    // the cut-off group.
    const plan = planScroll(ctx({ fraction: 1, groups: straddling }), 'forward');
    expect(plan).toEqual({ kind: 'scroll', top: 880, snapped: true });
  });

  it('holds back even when no boundary was near enough to snap to', () => {
    // Ideal 1000, nearest landing 700 — 300px away, well outside the window —
    // so this is the cap acting on the raw landing point, not on a snap.
    const plan = planScroll(
      ctx({ fraction: 1, groups: [{ top: 700, bottom: 1060 }] }),
      'forward',
    );
    expect(plan).toEqual({ kind: 'scroll', top: 700, snapped: true });
  });

  it('leaves 75% alone, since its landing point is well inside the screen', () => {
    // Ideal 750 against a fold at 1000: the cap sits at 880, ahead of anywhere
    // this turn wanted to go, so it never bites.
    expect(planScroll(ctx({ fraction: 0.75, groups: straddling }), 'forward')).toMatchObject({
      top: 880,
    });
    expect(planScroll(ctx({ fraction: 0.5, groups: straddling }), 'forward')).toMatchObject({
      top: 500,
    });
  });

  it('still allows a forward snap past the ideal when nothing is being cut off', () => {
    // Both groups end above the fold, so overshooting the ideal loses nothing.
    expect(planScroll(ctx({ groups: at(620, 780) }), 'forward')).toMatchObject({ top: 780 });
  });

  it('does not hold a retreat back — you are re-reading, not skipping', () => {
    // From 2000 the fold is at 3000, and the group at 2880 straddles it.
    const shared = ctx({
      scrollTop: 2000,
      fraction: 1,
      groups: [
        { top: 1300, bottom: 1420 },
        { top: 2880, bottom: 3060 },
      ],
    });
    // Forward is held back to that group's top...
    expect(planScroll(shared, 'forward')).toMatchObject({ top: 2880, snapped: true });
    // ...while retreating ignores it entirely and travels its full step.
    expect(planScroll(shared, 'back')).toMatchObject({ top: 1000 });
  });

  it('refuses to stall on a group taller than the screen', () => {
    // Capping to this group's top would mean no travel at all, so the press
    // takes the cut rather than doing nothing.
    const plan = planScroll(
      ctx({ fraction: 1, groups: [{ top: 0, bottom: 1500 }] }),
      'forward',
    );
    expect(plan).toEqual({ kind: 'scroll', top: 1000, snapped: false });
  });

  it('advances only as far as an oversized group allows, then clears it', () => {
    // A group from 300 to 1400 cannot be shown in full from here, so the turn
    // stops at its top even though that is well short of a screen.
    const oversized = [{ top: 300, bottom: 1400 }];
    expect(planScroll(ctx({ fraction: 1, groups: oversized }), 'forward')).toMatchObject({
      top: 300,
    });
    // From there the cap lifts, so the next press is a normal full turn rather
    // than pinning against the same group forever.
    expect(
      planScroll(ctx({ scrollTop: 300, fraction: 1, groups: oversized }), 'forward'),
    ).toMatchObject({ top: 1300 });
  });

  it('measures the cut against the chrome, not the raw viewport top', () => {
    // With 60px of sticky chrome the group must land at 820, not 880, or its
    // chord line sits behind the section header.
    const plan = planScroll(
      ctx({ fraction: 1, topInset: 60, groups: [{ top: 880, bottom: 1060 }] }),
      'forward',
    );
    expect(plan).toEqual({ kind: 'scroll', top: 820, snapped: true });
  });
});

describe('planScroll — song edges', () => {
  it('reports the edge at the bottom rather than scrolling nowhere', () => {
    expect(planScroll(ctx({ scrollTop: 5000 }), 'forward')).toEqual({ kind: 'edge' });
  });

  it('reports the edge at the top', () => {
    expect(planScroll(ctx({ scrollTop: 0 }), 'back')).toEqual({ kind: 'edge' });
  });

  it('still advances from just short of the bottom, clamped to the end', () => {
    expect(planScroll(ctx({ scrollTop: 4900 }), 'forward')).toEqual({
      kind: 'scroll',
      top: 5000,
      snapped: false,
    });
  });

  it('never scrolls above the top of the song', () => {
    expect(planScroll(ctx({ scrollTop: 200 }), 'back')).toEqual({
      kind: 'scroll',
      top: 0,
      snapped: false,
    });
  });

  it('treats a song shorter than the viewport as being at both edges', () => {
    expect(planScroll(ctx({ scrollTop: 0, maxScroll: 0 }), 'forward')).toEqual({ kind: 'edge' });
    expect(planScroll(ctx({ scrollTop: 0, maxScroll: -300 }), 'forward')).toEqual({ kind: 'edge' });
  });
});
