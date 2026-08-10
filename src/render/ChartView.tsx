import { useMemo } from 'react';
import type { Song } from '../lcf/types';
import { SectionView } from './SectionView';
import { useBarsPerRow } from './useBarsPerRow';

/**
 * Base chord size in px at scale 1.0. Raised from 34 after the first iPad
 * run-through: 34 was legible on the desk and not at gig distance.
 */
export const BASE_CHORD_PX = 41;

/** The most bars on any one chord line — what the bar width is fitted to. */
function longestChordLine(song: Song): number {
  let longest = 1;
  for (const section of song.sections) {
    for (const group of section.groups) {
      if (group.chords) longest = Math.max(longest, group.chords.bars.length);
    }
  }
  return longest;
}

export function ChartView({
  song,
  fontScale,
  showLyrics,
}: {
  song: Song;
  fontScale: number;
  showLyrics: boolean;
}) {
  const chordPx = BASE_CHORD_PX * fontScale;
  const longestLine = useMemo(() => longestChordLine(song), [song]);
  const { ref, barPx, capacity, max } = useBarsPerRow(chordPx, longestLine);

  return (
    <div
      className="chart"
      ref={ref}
      style={{ '--chord-px': `${chordPx}px`, '--bar-w': `${barPx}px` } as React.CSSProperties}
    >
      <header className="chart__meta">
        <h1 className="chart__title">{song.meta.title}</h1>
        <p className="chart__byline">
          {song.meta.artist && <span>{song.meta.artist}</span>}
          {song.meta.key && <span>Key {song.meta.key}</span>}
          {song.meta.capo !== undefined && <span>Capo {song.meta.capo}</span>}
          <span>{song.meta.time.raw}</span>
          {song.meta.tempo !== undefined && <span>{song.meta.tempo} bpm</span>}
        </p>
      </header>

      {(song.errors.length > 0 || song.warnings.length > 0) && (
        <div className="issues">
          {song.errors.map((e, i) => (
            <p className="issue issue--error" key={`e${i}`}>
              {e.line > 0 && <b>Line {e.line}: </b>}
              {e.message}
            </p>
          ))}
          {song.warnings.map((w, i) => (
            <p className="issue issue--warning" key={`w${i}`}>
              {w.line > 0 && <b>Line {w.line}: </b>}
              {w.message}
            </p>
          ))}
        </div>
      )}

      {song.sections.map((s, i) => (
        <SectionView
          key={i}
          section={s}
          time={song.meta.time}
          fit={{ capacity, max }}
          showLyrics={showLyrics}
        />
      ))}
    </div>
  );
}
