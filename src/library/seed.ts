import type { BackupSong } from './backup';
import { identify } from './identity';

/**
 * Songs compiled into the bundle, used to seed an empty library on first run.
 *
 * `songs/` holds only the self-authored format fixture, because the deployed
 * site is public — GitHub Pages offers no private-site option — and nothing
 * under copyright gets published. Your own charts go in `songs/local/`, which is
 * gitignored: they seed the library in dev and in any build you run yourself,
 * and are absent from the build CI publishes.
 *
 * On the iPad the real charts arrive by importing the `.lcf` files instead,
 * which is the whole point of this phase: they live on the device without ever
 * entering the repo.
 */
// The options must be an object literal at the call site — Vite rewrites these
// statically and will not follow a hoisted const.
const shipped = import.meta.glob('../../songs/*.lcf', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const local = import.meta.glob('../../songs/local/*.lcf', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const fileNameOf = (path: string) => path.split('/').pop() ?? '';

/**
 * Which song to open on a first run, before anything has been chosen.
 *
 * Your own chart wins where one is present, which is what makes a dev server
 * useful; the published build has only the fixture to offer.
 */
export function preferredSeedTitle(): string | null {
  const pick = Object.entries(local)[0] ?? Object.entries(shipped)[0];
  return pick ? identify(pick[1], fileNameOf(pick[0])).title : null;
}

export function bundledSongs(): BackupSong[] {
  const songs: BackupSong[] = [];
  for (const [path, text] of [...Object.entries(shipped), ...Object.entries(local)]) {
    const { title } = identify(text, fileNameOf(path));
    songs.push({ title, text });
  }
  return songs;
}
