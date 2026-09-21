/**
 * Runs charts through the chord grammar and reports every token that is not
 * read as a chord, rest, N.C. or repeat — the tokens the tightened grammar of
 * TRANSPOSITION-PLAN.md §6.2 turns into dimmed literals that never transpose.
 *
 *   node scripts/check-grammar.mjs <file|dir> ...
 *
 * Takes `.lcf` files, directories of them, and backup bundles (`.json`), so a
 * backup exported from the iPad can be checked in one go. Reads only; writes
 * nothing.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { runnerImport } from 'vite';

// Through Vite, because the source uses extensionless imports Node won't resolve.
const { module: parser } = await runnerImport('/src/lcf/parse.ts');
const { parseLcf } = parser;

/** The grammar before §6.2 — anything at all after the root. */
const OLD_CHORD_RE = /^([A-G])(#|b)?([^/\s]*)(?:\/([A-G])(#|b)?)?$/;

function* charts(path) {
  if (statSync(path).isDirectory()) {
    for (const f of readdirSync(path)) {
      if (/\.(lcf|json)$/i.test(f)) yield* charts(join(path, f));
    }
    return;
  }
  const text = readFileSync(path, 'utf8');
  if (text.trim().startsWith('{')) {
    for (const s of JSON.parse(text).songs ?? []) yield { name: s.title, text: s.text };
  } else {
    yield { name: basename(path), text };
  }
}

let songs = 0;
let chords = 0;
const changed = [];
const literals = [];

for (const arg of process.argv.slice(2)) {
  for (const { name, text } of charts(arg)) {
    songs += 1;
    // Definitions only: references are copies, and would repeat every finding.
    for (const section of parseLcf(text).sections) {
      if (section.role === 'reference' || section.role === 'lyric-reference') continue;
      for (const g of section.groups) {
        for (const bar of g.chords?.bars ?? []) {
          for (const t of bar.tokens) {
            if (t.kind === 'chord') chords += 1;
            if (t.kind !== 'literal') continue;
            const row = `${name}, line ${g.chords.line}: ${t.text}`;
            (OLD_CHORD_RE.test(t.text) ? changed : literals).push(row);
          }
        }
      }
    }
  }
}

console.log(`${songs} songs, ${chords} chord tokens.`);
console.log(`\nWere chords, now literals (${changed.length}) — review these:`);
for (const r of changed) console.log(`  ${r}`);
console.log(`\nLiterals under both grammars (${literals.length}):`);
for (const r of literals) console.log(`  ${r}`);
