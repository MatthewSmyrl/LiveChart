/**
 * Music glyphs drawn as inline SVG.
 *
 * These are deliberately *not* Unicode characters. The Musical Symbols block
 * (U+1D13B–U+1D13E) has unreliable font coverage on iOS and falls back to tofu
 * on exactly the device this app targets. They are also drawn schematically
 * rather than calligraphically — legibility at stage distance beats engraving
 * fidelity.
 */

interface GlyphProps {
  /** Height in em, relative to the surrounding chord text. */
  size?: number;
  title?: string;
}

function Svg({ children, size = 1, viewBox, title }: GlyphProps & { children: React.ReactNode; viewBox: string }) {
  return (
    <svg
      className="glyph"
      viewBox={viewBox}
      style={{ height: `${size}em` }}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Whole rest — a filled block hanging below the staff line. */
export function WholeRest(props: GlyphProps) {
  return (
    <Svg {...props} viewBox="0 0 24 24" title={props.title ?? 'whole rest'}>
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="10" width="10" height="5.5" fill="currentColor" />
    </Svg>
  );
}

/** Half rest — a filled block sitting on the staff line. */
export function HalfRest(props: GlyphProps) {
  return (
    <Svg {...props} viewBox="0 0 24 24" title={props.title ?? 'half rest'}>
      <rect x="7" y="8.5" width="10" height="5.5" fill="currentColor" />
      <line x1="3" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  );
}

/** Quarter rest — schematic zigzag, the most recognisable rest at distance. */
export function QuarterRest(props: GlyphProps) {
  return (
    <Svg {...props} viewBox="0 0 24 24" title={props.title ?? 'quarter rest'}>
      <path
        d="M14.5 2.5 L8.5 9 L14 13.5 L8 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 18 Q13 17 15.5 21.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Eighth rest — slanted stroke with a single flag. */
export function EighthRest(props: GlyphProps) {
  return (
    <Svg {...props} viewBox="0 0 24 24" title={props.title ?? 'eighth rest'}>
      <path
        d="M15 6.5 L10 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="7.5" r="2.8" fill="currentColor" />
      <path d="M11.8 6 Q16 5 16.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** Simile / repeat-previous-bar mark. Renders the `%` token. */
export function RepeatBar(props: GlyphProps) {
  return (
    <Svg {...props} viewBox="0 0 24 24" title={props.title ?? 'repeat previous bar'}>
      <circle cx="7.5" cy="7.5" r="2" fill="currentColor" />
      <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16.5" cy="16.5" r="2" fill="currentColor" />
    </Svg>
  );
}

/**
 * Pick the rest glyph from how many beat slots the token occupies.
 * This is why rests needed no duration syntax — see docs/lcf-format.md, "Rests".
 */
export function RestGlyph({ beats, barBeats, size }: { beats: number; barBeats: number; size?: number }) {
  if (beats >= barBeats) return <WholeRest size={size} />;
  if (beats >= barBeats / 2) return <HalfRest size={size} />;
  if (beats >= 1) return <QuarterRest size={size} />;
  return <EighthRest size={size} />;
}
