import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ResolvedConfig } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Every file under `dir`, as paths relative to it, with forward slashes. */
function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

/**
 * Emits a service worker that precaches the whole build.
 *
 * Written by hand rather than pulled in from Workbox: the app is one page and a
 * handful of assets, the caching rule is "everything, cache-first", and a
 * personal offline tool for the stage is not worth a plugin's worth of
 * dependency surface. The asset list is taken from `dist` after the build, so
 * it picks up files copied from `public/` as well as hashed bundle output.
 */
export function serviceWorker(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'livechart:service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    // `writeBundle` runs once dist is on disk, including `public/` copies.
    writeBundle() {
      const dist = config.build.outDir;
      const base = config.base.endsWith('/') ? config.base : `${config.base}/`;

      const files = walk(dist).filter((f) => f !== 'sw.js');
      const urls = files.map((f) => base + f);

      // The cache name has to change whenever any byte of the build does, or a
      // deploy leaves stale assets in place until the cache is cleared by hand.
      const hash = createHash('sha256');
      for (const file of files.sort()) {
        hash.update(file);
        hash.update(readFileSync(join(dist, file)));
      }

      const source = readFileSync(join(HERE, 'sw-template.js'), 'utf8')
        .replace('__CACHE__', `livechart-${hash.digest('hex').slice(0, 12)}`)
        .replace('__ASSETS__', JSON.stringify(urls, null, 2))
        .replace('__INDEX__', `${base}index.html`);

      writeFileSync(join(dist, 'sw.js'), source);
      this.info?.(`service worker precaching ${urls.length} files`);
    },
  };
}
