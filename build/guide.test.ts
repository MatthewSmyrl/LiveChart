import { describe, expect, it } from 'vitest';
import { slugify } from './guide';

/**
 * The guide's contents lists and cross-page links are written as GitHub
 * anchors, because GitHub is where the guide is also read. If these slugs stop
 * matching GitHub's, every one of those links silently lands at the top of the
 * page instead — which has now happened twice, so it is tested.
 */
describe('heading slugs', () => {
  it('matches GitHub for ordinary headings', () => {
    expect(slugify('Making one')).toBe('making-one');
    expect(slugify('Backing up, and why you should')).toBe('backing-up-and-why-you-should');
  });

  it('sees through the markup a heading is rendered with', () => {
    expect(slugify('The <code>.lcf</code> format')).toBe('the-lcf-format');
  });

  // `marked` escapes an apostrophe to `&#39;`. Stripping only the punctuation
  // around it left the digits behind: `songs-that-aren39t-there`.
  it('strips numeric entities rather than leaving their digits behind', () => {
    expect(slugify('Songs that aren&#39;t there')).toBe('songs-that-arent-there');
    expect(slugify('Songs that aren&apos;t there')).toBe('songs-that-arent-there');
    expect(slugify('Songs that aren&#x27;t there')).toBe('songs-that-arent-there');
  });
});
