import { useRef } from 'react';
import type { Direction } from './scrollPlan';

/** Movement and duration past which a touch was a scroll drag, not a tap. */
const TAP_SLOP_PX = 12;
const TAP_MAX_MS = 600;

/**
 * Full-screen tap targets mirroring the pedal, for when the pedal is packed
 * away or its battery has died mid-set.
 *
 * The bands are stacked rather than side by side: your hand comes to the iPad
 * from below, so the largest and lowest band is the one you need most.
 * Everything is anchored to the viewport, so the target never moves as the
 * song scrolls.
 */
export function TapZones({
  onTurn,
  onReveal,
  hint,
}: {
  onTurn: (direction: Direction) => void;
  onReveal: () => void;
  /** Outline the bands while the toolbar is up, so the layout is learnable. */
  hint: boolean;
}) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const zone = (className: string, act: () => void) => ({
    className: `zone ${className}`,
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    // Fires on pointerup rather than pointerdown so that dragging the chart to
    // scroll by hand does not also turn the page.
    onPointerUp: (e: React.PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const moved = Math.hypot(e.clientX - from.x, e.clientY - from.y);
      if (moved <= TAP_SLOP_PX && Date.now() - from.t <= TAP_MAX_MS) act();
    },
    onPointerCancel: () => {
      start.current = null;
    },
  });

  return (
    // The pedal and its keyboard bindings are the accessible path to these same
    // actions; the zones are a redundant pointer surface over the chart.
    <div className={`zones ${hint ? 'zones--hint' : ''}`} aria-hidden="true">
      <div {...zone('zone--chrome', onReveal)}>
        <span className="zone__label">menu</span>
      </div>
      <div {...zone('zone--back', () => onTurn('back'))}>
        <span className="zone__label">back</span>
      </div>
      <div {...zone('zone--forward', () => onTurn('forward'))}>
        <span className="zone__label">advance</span>
      </div>
    </div>
  );
}
