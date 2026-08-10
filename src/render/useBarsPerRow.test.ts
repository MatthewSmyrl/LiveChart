import { describe, expect, it } from 'vitest';
import { MAX_BAR_EM, MIN_BAR_EM, columnsFor, planBars, snap } from './useBarsPerRow';

/** iPad landscape: 1180px viewport less the chart's 16px padding either side. */
const IPAD = 1148;
/** BASE_CHORD_PX at scale 1.0. */
const CHORD = 41;

describe('planBars', () => {
  it('fits the longest line of the song on one row', () => {
    // "That Funny Feeling" tops out at 5 bars in a line.
    const plan = planBars(IPAD, CHORD, 5);
    expect(plan.capacity).toBeGreaterThanOrEqual(5);
    expect(columnsFor(5, plan.capacity, plan.max)).toBe(5);
  });

  it('narrows the bar as the longest line grows, rather than wrapping it', () => {
    const four = planBars(IPAD, CHORD, 4);
    const six = planBars(IPAD, CHORD, 6);
    expect(six.barPx).toBeLessThan(four.barPx);
    expect(columnsFor(6, six.capacity, six.max)).toBe(6);
  });

  it('never lets a bar get narrower than the widest chord it must hold', () => {
    // 12 bars cannot fit at any legible width; the floor wins and the line wraps.
    const plan = planBars(IPAD, CHORD, 12);
    expect(plan.barPx).toBe(MIN_BAR_EM * CHORD);
    expect(columnsFor(12, plan.capacity, plan.max)).toBeLessThan(12);
  });

  it('caps the bar so a short line does not sprawl the full screen', () => {
    expect(planBars(IPAD, CHORD, 2).barPx).toBe(MAX_BAR_EM * CHORD);
  });

  it('scales with the font, so the fit survives a nudge of the size control', () => {
    // 5 bars across must still hold at 130%, where the old fixed 6em bar broke.
    const plan = planBars(IPAD, CHORD * 1.3, 5);
    expect(columnsFor(5, plan.capacity, plan.max)).toBe(5);
  });

  it('renders sanely before the container has been measured', () => {
    const plan = planBars(0, CHORD, 5);
    expect(plan.capacity).toBe(4);
    expect(plan.barPx).toBeGreaterThan(0);
  });
});

describe('snap', () => {
  it('avoids odd row widths above 3, which read as a mistake', () => {
    expect(snap(5)).toBe(4);
    expect(snap(7)).toBe(6);
    expect(snap(9)).toBe(8);
  });

  it('keeps small counts usable', () => {
    expect(snap(3)).toBe(3);
    expect(snap(2)).toBe(2);
    expect(snap(1)).toBe(1);
    expect(snap(0)).toBe(1);
  });
});

describe('columnsFor', () => {
  it('keeps a phrase on one row when it fits', () => {
    // This song is full of 5-bar phrases; they must not wrap 4 + 1.
    expect(columnsFor(5, 5, snap(5))).toBe(5);
    expect(columnsFor(4, 5, snap(5))).toBe(4);
    expect(columnsFor(2, 5, snap(5))).toBe(2);
  });

  it('falls back to the snapped width once a line cannot fit', () => {
    expect(columnsFor(4, 3, snap(3))).toBe(3);
    expect(columnsFor(12, 5, snap(5))).toBe(4);
  });

  it('never returns zero columns', () => {
    expect(columnsFor(0, 4, 4)).toBe(1);
  });
});
