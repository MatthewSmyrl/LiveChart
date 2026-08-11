import { parseLcf } from '../lcf/parse';

/**
 * Collapses a title to a stable key.
 *
 * Two files whose titles differ only in case or spacing are the same song, so
 * re-importing an edited chart updates it rather than leaving a near-duplicate
 * to choose between at a gig.
 */
export function idFor(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * The name to file a chart under: its own `Title` attribute where it has one,
 * otherwise the file name it arrived as.
 *
 * A chart missing `Title` is still worth importing — the parser treats that as
 * an error but renders the song anyway, and a song you can play is better than
 * one the library refused.
 */
export function titleFor(text: string, fileName = ''): string {
  const parsed = parseLcf(text);
  const missingTitle = parsed.errors.some((e) => /Title/.test(e.message));
  if (!missingTitle && parsed.meta.title.trim()) return parsed.meta.title.trim();

  const fromFile = fileName.replace(/\.[^.]*$/, '').trim();
  return fromFile || 'Untitled';
}

export function identify(text: string, fileName = ''): { id: string; title: string } {
  const title = titleFor(text, fileName);
  return { id: idFor(title), title };
}

/**
 * Does this look like a chart at all?
 *
 * Deliberately lenient — anything with a header attribute, a section or a chord
 * line counts. The parser never throws, so the only thing worth rejecting is a
 * file that plainly isn't a chart, such as a PDF the picker allowed through.
 */
export function looksLikeChart(text: string): boolean {
  return text
    .split(/\r\n?|\n/)
    .some((line) => /^\s*\[.+\]/.test(line) || /^\s*\|/.test(line) || /^\s*\w[\w ]*:\s*\S/.test(line));
}

/** A file name safe to hand to a download or a share sheet. */
export function fileNameFor(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '-').trim();
  return `${safe || 'Untitled'}.lcf`;
}
