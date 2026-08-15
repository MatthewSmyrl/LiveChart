import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import type { Plugin, ResolvedConfig } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Where the guide lands, relative to the build root. */
const OUT_DIR = 'guide';

/** `docs/README.md` becomes the folder's index, so `guide/` resolves on its own. */
function pageNameFor(markdownFile: string): string {
  return markdownFile === 'README.md' ? 'index.html' : markdownFile.replace(/\.md$/, '.html');
}

/** The first `# heading`, for the browser tab. */
function titleFor(markdown: string): string {
  const heading = /^#\s+(.+)$/m.exec(markdown);
  // Inline markdown belongs in the page, not in a tab: `.lcf` arrives here with
  // its backticks still on.
  const title = heading?.[1]?.replace(/[`*]/g, '').trim();
  if (!title) return 'LiveChart User Guide';
  // Chapters named after the app already say it once, which is enough.
  return /LiveChart/i.test(title) ? title : `${title} — LiveChart`;
}

/**
 * GitHub's heading slug, near enough.
 *
 * The guide's own contents lists and cross-page links are written as GitHub
 * anchors, because that is where it is also read — so these have to match, or
 * every one of them lands at the top of the page instead.
 */
function slugify(headingHtml: string): string {
  return headingHtml
    .replace(/<[^>]+>/g, '') // inline code and emphasis inside the heading
    .replace(/&[a-z]+;/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, '')
    .replace(/ +/g, '-');
}

/** `marked` emits bare headings, so the anchors have to be added here. */
function addHeadingIds(html: string): string {
  const used = new Map<string, number>();
  return html.replace(/<h([1-6])>(.*?)<\/h\1>/gs, (_, level: string, inner: string) => {
    const base = slugify(inner);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const id = seen === 0 ? base : `${base}-${seen}`;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

function render(markdown: string): string {
  const html = addHeadingIds(marked.parse(markdown, { async: false, gfm: true }) as string);
  return (
    html
      // The guide's own cross-links are written for GitHub, which renders the
      // markdown directly. Here they have to point at what we actually emit.
      .replace(/href="([^"]*?)\.md(#[^"]*)?"/g, 'href="$1.html$2"')
      .replace(/href="README\.html/g, 'href="index.html')
      // Reference tables are wider than an iPad in portrait. Let each one scroll
      // inside itself rather than making the whole page slide sideways.
      .replace(/<table>/g, '<div class="table-scroll"><table>')
      .replace(/<\/table>/g, '</table></div>')
      // A couple of tables are laid out as two unlabelled columns. Markdown
      // still requires the header row, and rendering it leaves an empty band
      // across the top of the table.
      .replace(/<thead>\s*<tr>(?:\s*<th[^>]*>\s*<\/th>)+\s*<\/tr>\s*<\/thead>/g, '')
  );
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="guide.css">
<script>
// Match whatever the app is set to. Inline and before the body so the guide
// never flashes white on the way in — which, opened mid-set from a dark stage,
// is the whole point.
try {
  var t = JSON.parse(localStorage.getItem('lc.theme'));
  if (t === 'light') document.documentElement.dataset.theme = 'light';
} catch (e) {}
</script>
</head>
<body>
<div class="guide-back"><a href="../index.html">← Back to LiveChart</a></div>
${body}</body>
</html>
`;
}

interface GuideFile {
  fileName: string;
  source: string;
}

/** Every guide page plus its stylesheet, ready to write. */
function build(root: string): GuideFile[] {
  const docs = join(root, 'docs');
  const files: GuideFile[] = [
    { fileName: `${OUT_DIR}/guide.css`, source: readFileSync(join(HERE, 'guide.css'), 'utf8') },
  ];

  for (const entry of readdirSync(docs)) {
    if (!entry.endsWith('.md')) continue;
    const markdown = readFileSync(join(docs, entry), 'utf8');
    files.push({
      fileName: `${OUT_DIR}/${pageNameFor(entry)}`,
      source: page(titleFor(markdown), render(markdown)),
    });
  }

  return files;
}

/**
 * Publishes `docs/` as HTML inside the app, at `guide/`.
 *
 * Generated at build time rather than kept as a second hand-written copy, for
 * the same reason the format spec was folded into the guide in the first place:
 * two versions of a document drift, and this one is the version people read.
 *
 * The service worker picks these up for free — it walks the whole of `dist`
 * after the build — so the guide is readable offline at a gig, which is exactly
 * where someone is most likely to need it and least likely to have signal.
 */
export function guide(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'livechart:guide',
    configResolved(resolved) {
      config = resolved;
    },

    // Rendered per request in dev so the Guide button works on the dev server
    // and an edit to `docs/` shows up on reload, with no build step in between.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        const match = /^\/guide\/([\w.-]+)$/.exec(path);
        const wanted = path === '/guide' || path === '/guide/' ? 'guide/index.html' : match && `guide/${match[1]}`;
        if (!wanted) return next();

        const file = build(config.root).find((f) => f.fileName === wanted);
        if (!file) return next();

        res.setHeader('Content-Type', wanted.endsWith('.css') ? 'text/css' : 'text/html');
        res.end(file.source);
      });
    },

    // Emitted as bundle assets, so they are on disk before the service worker
    // plugin walks `dist` to build its precache list.
    generateBundle() {
      for (const { fileName, source } of build(config.root)) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
