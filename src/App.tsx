import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseLcf } from './lcf/parse';
import { ChartView } from './render/ChartView';
import { LibraryView } from './library/LibraryView';
import { idFor } from './library/identity';
import { preferredSeedTitle } from './library/seed';
import { useLibrary } from './library/useLibrary';
import { PedalLearn } from './perform/PedalLearn';
import { TapZones } from './perform/TapZones';
import { DEFAULT_BINDINGS, type Bindings } from './perform/keymap';
import { usePerformance } from './perform/usePerformance';
import { useWakeLock } from './perform/useWakeLock';

/** `?song=<title>` opens a chart directly, which is handy in dev. */
const requestedTitle = new URLSearchParams(location.search).get('song');

type Theme = 'dark' | 'light';

/** Songs live in IndexedDB; preferences stay in localStorage. */
function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / quota — prefs just won't persist */
    }
  }, [key, value]);
  return [value, setValue];
}

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.2;

/** Fraction of the viewport one page turn travels. */
const STEPS = [0.5, 0.75, 1] as const;

/** Idle time before the toolbar gets out of the way during a song. */
const CHROME_IDLE_MS = 3500;

/**
 * The tap-zone outlines clear sooner than the toolbar. They are a reference you
 * read once, not a control you might reach for, so they only need to be up long
 * enough to take in — and every extra second is clutter over the chart.
 */
const HINT_IDLE_MS = 2000;

export function App() {
  const [fontScale, setFontScale] = usePref('lc.fontScale', 1);
  const [lyricsPref, setLyricsPref] = usePref('lc.showLyrics', true);
  const [theme, setTheme] = usePref<Theme>('lc.theme', 'dark');
  const [step, setStep] = usePref<number>('lc.step', 0.75);
  const [bindings, setBindings] = usePref<Bindings>('lc.bindings', DEFAULT_BINDINGS);
  const [rememberedId, setRememberedId] = usePref<string | null>('lc.currentSong', null);

  const [perform, setPerform] = useState(false);
  const [learning, setLearning] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);

  const library = useLibrary();
  const { songs } = library;

  // Land on the song you were last looking at, so launching mid-set costs no
  // taps. A first run has nothing remembered, and falls back to whatever seeded
  // the library.
  const currentId = useMemo(() => {
    if (songs === null) return null;
    const has = (id: string | null): id is string => !!id && songs.some((s) => s.id === id);
    const seeded = preferredSeedTitle();
    for (const candidate of [
      requestedTitle && idFor(requestedTitle),
      rememberedId,
      seeded && idFor(seeded),
    ]) {
      if (has(candidate)) return candidate;
    }
    return null;
  }, [songs, rememberedId]);

  const current = songs?.find((s) => s.id === currentId) ?? null;
  const song = useMemo(() => (current ? parseLcf(current.text) : null), [current?.text]);

  // Nothing to show means the library is the only sensible screen — a first run
  // with an empty store, or the last song deleted.
  const inLibrary = browsing || (songs !== null && current === null);

  // A different song starts at its own beginning, not wherever the last one was.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentId]);

  // A song's `Lyrics:` tag wins every time the song opens; the toolbar button
  // overrides it for as long as that song is up, and reopening brings the tag
  // back. Cleared on a song change — Phase 4b swaps songs without a reload,
  // which is the case this exists for.
  const [lyricsOverride, setLyricsOverride] = useState<boolean | null>(null);
  useEffect(() => setLyricsOverride(null), [song]);
  const showLyrics = lyricsOverride ?? song?.meta.lyricsDefault ?? lyricsPref;

  // The button writes the saved preference too: it is "what you last chose",
  // and it only decides songs whose file stays out of it.
  const toggleLyrics = () => {
    setLyricsOverride(!showLyrics);
    setLyricsPref(!showLyrics);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Reclaims the toolbar's height for the chart, and lets the sticky section
  // headers ride at the very top of the screen.
  useEffect(() => {
    document.documentElement.dataset.perform = perform ? 'on' : 'off';
  }, [perform]);

  const chromeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Both come up together and clear on their own schedules.
  const revealChrome = useCallback(() => {
    setChromeVisible(true);
    setHintVisible(true);
    clearTimeout(chromeTimer.current);
    clearTimeout(hintTimer.current);
    chromeTimer.current = setTimeout(() => setChromeVisible(false), CHROME_IDLE_MS);
    hintTimer.current = setTimeout(() => setHintVisible(false), HINT_IDLE_MS);
  }, []);

  useEffect(() => {
    clearTimeout(chromeTimer.current);
    clearTimeout(hintTimer.current);
    if (!perform) {
      setChromeVisible(true);
      setHintVisible(true);
      return;
    }
    // Stays up briefly on entry so the exit button is never a mystery.
    revealChrome();
    return () => {
      clearTimeout(chromeTimer.current);
      clearTimeout(hintTimer.current);
    };
  }, [perform, revealChrome]);

  // The learn screen must not be dismissable only by a pedal press it is trying
  // to capture, so it holds the chrome open while it is up.
  const chromeUp = !perform || chromeVisible || learning;

  const { turn, notice } = usePerformance({
    fraction: step,
    bindings,
    // A pedal press must not page the song list while you are choosing one.
    suspended: learning || inLibrary,
    // Phase 5 advances the setlist here. For now the confirming press parks the
    // song at its end rather than doing something surprising.
    onEnd: undefined,
  });

  // Reported on the pedal screen rather than over the chart: on iPadOS the lock
  // is dropped and re-taken constantly, so a live badge would flicker through
  // every song to say nothing actionable. The pedal screen is opened
  // deliberately, which is the right place to check whether an iPadOS update
  // has fixed this.
  const wake = useWakeLock(perform);

  const nudge = (delta: number) =>
    setFontScale(Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, fontScale + delta)) * 100) / 100);

  const cycleStep = () => setStep(STEPS[(STEPS.indexOf(step as (typeof STEPS)[number]) + 1) % STEPS.length] ?? 0.75);

  if (inLibrary) {
    return (
      <LibraryView
        library={library}
        currentId={currentId}
        onOpen={(id) => {
          setRememberedId(id);
          setBrowsing(false);
        }}
        onClose={() => setBrowsing(false)}
      />
    );
  }

  if (song === null) return <p className="library__empty">Opening the library…</p>;

  return (
    <>
      <div className={`toolbar ${chromeUp ? '' : 'toolbar--away'}`}>
        <div className="toolbar__group">
          <button className="btn" onClick={() => nudge(-0.1)} disabled={fontScale <= MIN_SCALE} aria-label="Smaller text">
            A<span className="btn__sub">−</span>
          </button>
          <span className="toolbar__readout">{Math.round(fontScale * 100)}%</span>
          <button className="btn" onClick={() => nudge(0.1)} disabled={fontScale >= MAX_SCALE} aria-label="Larger text">
            A<span className="btn__sup">+</span>
          </button>
        </div>
        <div className="toolbar__group">
          <button className="btn" onClick={() => setBrowsing(true)}>
            Songs
          </button>
          <button className="btn" onClick={cycleStep} aria-label={`Page turn travels ${step * 100}% of the screen`}>
            Step {step * 100}%
          </button>
          <button className="btn" onClick={() => setLearning(true)}>
            Pedal
          </button>
          <button
            className={`btn ${showLyrics ? 'btn--on' : ''}`}
            onClick={toggleLyrics}
            aria-pressed={showLyrics}
          >
            Lyrics
          </button>
          <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            className={`btn ${perform ? 'btn--on' : ''}`}
            onClick={() => setPerform(!perform)}
            aria-pressed={perform}
          >
            {perform ? 'Exit' : 'Perform'}
          </button>
        </div>
      </div>

      <ChartView song={song} fontScale={fontScale} showLyrics={showLyrics} />

      {perform && !learning && <TapZones onTurn={turn} onReveal={revealChrome} hint={hintVisible} />}

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {learning && (
        <PedalLearn
          bindings={bindings}
          onChange={setBindings}
          onClose={() => setLearning(false)}
          wake={wake}
        />
      )}
    </>
  );
}
