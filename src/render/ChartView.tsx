import { useMemo } from 'react';
import type { Song } from '../lcf/types';
import { prettyKey } from '../music/notes';
import { type KeyState, keyBadge } from '../music/transpose';
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
  keys,
  fontScale,
  showLyrics,
  onKeys,
}: {
  /** Already transposed — this view does not know transposition exists. */
  song: Song;
  /** The keys that produced `song`, for the header readout. */
  keys: KeyState;
  fontScale: number;
  showLyrics: boolean;
  /** Opens the key panel. The header readout is a second way in. */
  onKeys: () => void;
}) {
  const chordPx = BASE_CHORD_PX * fontScale;
  const longestLine = useMemo(() => longestChordLine(song), [song]);
  const { ref, barPx, capacity, max } = useBarsPerRow(chordPx, longestLine);

  const { appKey, appCapo, fileKey, fileCapo, shapeKey, transposed } = keys;
  // Rides in every sticky section header once the chart header has scrolled
  // away. Only when transposed: a chart in its own key needs no label.
  const marker = transposed ? keyBadge(keys) : undefined;

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
          <button className={`chart__keys ${transposed ? 'chart__keys--moved' : ''}`} onClick={onKeys}>
            Key {prettyKey(appKey)}
            {(appCapo > 0 || song.meta.capo !== undefined) && <> · Capo {appCapo}</>}
            {appCapo > 0 && <> · {prettyKey(shapeKey)} shapes</>}
          </button>
          {transposed && (
            <span className="chart__moved">
              Transposed from {prettyKey(fileKey)}
              {fileCapo > 0 && `, capo ${fileCapo}`}
            </span>
          )}
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
          {...(marker ? { marker } : {})}
        />
      ))}
    </div>
  );
}
