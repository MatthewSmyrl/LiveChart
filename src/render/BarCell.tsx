import type { Bar, TimeSignature, Token } from '../lcf/types';
import { RepeatBar, RestGlyph } from './Glyphs';

function TokenView({ token, time }: { token: Token; time: TimeSignature }) {
  // Tokens share the bar in proportion to the beats they occupy.
  const style = { flexGrow: Math.max(token.beats, 1) };

  switch (token.kind) {
    case 'chord':
      return (
        <span className="token token--chord" style={style}>
          <span className="chord__root">
            {token.root}
            {token.accidental && <span className="chord__accidental">{token.accidental}</span>}
          </span>
          {token.quality && <span className="chord__quality">{token.quality}</span>}
          {token.bass && (
            <span className="chord__bass">
              /{token.bass}
              {token.bassAccidental && <span className="chord__accidental">{token.bassAccidental}</span>}
            </span>
          )}
        </span>
      );
    case 'rest':
      return (
        <span className="token token--rest" style={style}>
          <RestGlyph beats={token.beats} barBeats={time.beats} size={1.1} />
        </span>
      );
    case 'nc':
      return (
        <span className="token token--nc" style={style}>
          N.C.
        </span>
      );
    case 'literal':
      return (
        <span className="token token--literal" style={style}>
          {token.text}
        </span>
      );
  }
}

/** Subtle beat ticks, grouped per the time signature (3+3 for 6/8, etc). */
function BeatTicks({ time }: { time: TimeSignature }) {
  return (
    <div className="bar__beats" aria-hidden="true">
      {time.grouping.map((count, gi) => (
        <div className="bar__beat-group" key={gi}>
          {Array.from({ length: count }, (_, bi) => (
            <span className="bar__beat" key={bi} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BarCell({ bar, time }: { bar: Bar; time: TimeSignature }) {
  if (bar.isRepeat) {
    return (
      <div className="bar bar--repeat">
        <RepeatBar size={1.6} />
      </div>
    );
  }

  if (bar.tokens.length === 0) {
    return <div className="bar bar--empty" />;
  }

  // Ticks earn their space only where beat placement is ambiguous: a bar with
  // several chords in it, or any metre that isn't plain 4/4.
  const showTicks = bar.tokens.length > 1 || time.beats !== 4 || time.unit !== 4;

  return (
    <div className="bar">
      <div className="bar__tokens">
        {bar.tokens.map((t, i) => (
          <TokenView key={i} token={t} time={time} />
        ))}
      </div>
      {showTicks && <BeatTicks time={time} />}
    </div>
  );
}
