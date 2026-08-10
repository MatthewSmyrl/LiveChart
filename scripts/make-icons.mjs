/**
 * Renders the PWA icons from the same artwork as `public/icon.svg`.
 *
 * iOS will not take an SVG for `apple-touch-icon`, and the manifest wants fixed
 * raster sizes, so the artwork has to exist as PNG. Rather than carry an image
 * toolchain for six rounded rectangles, this rasterises them directly: every
 * shape in the icon is a rounded rect, so coverage is one distance test, and
 * 4x supersampling gives clean edges.
 *
 * Run after editing `public/icon.svg` — the two must be kept in step by hand:
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** The artwork, painted in order onto an opaque background. Mirrors icon.svg. */
const SHAPES = [
  { x: 0, y: 0, w: 512, h: 512, r: 0, fill: [0x0e, 0x0f, 0x13] }, // background
  { x: 76, y: 118, w: 170, h: 34, r: 8, fill: [0xff, 0x6f, 0x5e] }, // section header
  // Barlines. Round-capped strokes, so they extend 6px past each endpoint.
  { x: 70, y: 182, w: 12, h: 152, r: 6, fill: [0x6f, 0x77, 0x87] },
  { x: 256, y: 182, w: 12, h: 152, r: 6, fill: [0x6f, 0x77, 0x87] },
  { x: 442, y: 182, w: 12, h: 152, r: 6, fill: [0x6f, 0x77, 0x87] },
  { x: 104, y: 226, w: 86, h: 44, r: 8, fill: [0xff, 0xff, 0xff] }, // chords
  { x: 290, y: 226, w: 66, h: 44, r: 8, fill: [0xff, 0xff, 0xff] },
  { x: 76, y: 368, w: 280, h: 26, r: 8, fill: [0x93, 0xb4, 0xe6] }, // lyric
];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function covers(s, px, py) {
  if (px < s.x || px > s.x + s.w || py < s.y || py > s.y + s.h) return false;
  if (s.r <= 0) return true;
  const cx = clamp(px, s.x + s.r, s.x + s.w - s.r);
  const cy = clamp(py, s.y + s.r, s.y + s.h - s.r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= s.r * s.r;
}

/** Topmost shape covering a point. The background always covers, so never null. */
function sample(px, py) {
  for (let i = SHAPES.length - 1; i >= 0; i--) {
    if (covers(SHAPES[i], px, py)) return SHAPES[i].fill;
  }
  return SHAPES[0].fill;
}

const SS = 4; // supersamples per axis

function render(size) {
  const scale = 512 / size;
  // One filter byte (0 = None) per scanline, then RGB triples.
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    let o = y * (1 + size * 3) + 1;
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((x + (sx + 0.5) / SS) * scale, (y + (sy + 0.5) / SS) * scale);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = SS * SS;
      raw[o++] = Math.round(r / n);
      raw[o++] = Math.round(g / n);
      raw[o++] = Math.round(b / n);
    }
  }
  return raw;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 — truecolour, no alpha. The icon is opaque.
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  // iOS ignores the manifest for the home-screen icon and uses this instead.
  ['apple-touch-icon.png', 180],
]) {
  const buf = png(size);
  writeFileSync(join(OUT, name), buf);
  console.log(`${name}  ${size}x${size}  ${(buf.length / 1024).toFixed(1)} kB`);
}
