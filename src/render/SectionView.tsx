import type { ChordLine, Group, Section, TimeSignature } from '../lcf/types';
import { BarCell } from './BarCell';
import { columnsFor } from './useBarsPerRow';

/** How many bars fit per row: `capacity` exactly, `max` once a line must wrap. */
export interface Fit {
  capacity: number;
  max: number;
}

/**
 * Distinct hues per section type so you can find the chorus by colour alone
 * when glancing down mid-song.
 */
function accentFor(name: string): string {
  if (name.includes('chorus') && !name.includes('pre')) return 'var(--accent-chorus)';
  if (name.includes('pre')) return 'var(--accent-pre)';
  if (name.includes('verse')) return 'var(--accent-verse)';
  if (name.includes('bridge') || name.includes('solo')) return 'var(--accent-bridge)';
  if (name.includes('intro') || name.includes('outro') || name.includes('fade')) return 'var(--accent-edge)';
  return 'var(--accent-verse)';
}

function ChordRow({ chords, time, fit }: { chords: ChordLine; time: TimeSignature; fit: Fit }) {
  const columns = columnsFor(chords.bars.length, fit.capacity, fit.max);
  return (
    <div className="chord-row">
      <div
        className="chord-row__bars"
        // Fixed, not minmax: bars must be identical width across every row, or
        // the grid stops being scannable. Capacity is derived from --bar-w, so
        // a row can never overflow.
        style={{ gridTemplateColumns: `repeat(${columns}, var(--bar-w))` }}
      >
        {chords.bars.map((bar, i) => (
          <BarCell key={i} bar={bar} time={time} />
        ))}
      </div>
      {chords.repeat > 1 && <span className="repeat-badge repeat-badge--line">×{chords.repeat}</span>}
      {chords.comment && <p className="comment comment--inline">{chords.comment}</p>}
    </div>
  );
}

function GroupView({
  group,
  time,
  fit,
  showLyrics,
}: {
  group: Group;
  time: TimeSignature;
  fit: Fit;
  showLyrics: boolean;
}) {
  // data-group marks the scroll-snap boundaries used in performance mode, so a
  // page turn can never separate a chord line from its lyrics.
  return (
    <div className="group" data-group="">
      {group.chords && <ChordRow chords={group.chords} time={time} fit={fit} />}
      {group.body.map((line, i) =>
        line.kind === 'comment' ? (
          <p className="comment" key={i}>
            {line.text}
          </p>
        ) : showLyrics ? (
          <p className="lyric" key={i}>
            {line.text}
          </p>
        ) : null,
      )}
    </div>
  );
}

export function SectionView({
  section,
  time,
  fit,
  showLyrics,
}: {
  section: Section;
  time: TimeSignature;
  fit: Fit;
  showLyrics: boolean;
}) {
  return (
    <section className="section" style={{ '--accent': accentFor(section.name) } as React.CSSProperties}>
      <h2 className="section__header">
        <span className="section__name">{section.displayName}</span>
        {section.repeat > 1 && <span className="repeat-badge">×{section.repeat}</span>}
        {section.note && <span className="section__note">{section.note}</span>}
      </h2>
      {section.groups.map((g, i) => (
        <GroupView key={i} group={g} time={time} fit={fit} showLyrics={showLyrics} />
      ))}
    </section>
  );
}
