#!/usr/bin/env node
/*
 * Brand art, from four master renders to every size the site serves.
 *
 * The masters in `assets/brand/source` are 1448x1086 renders on an off-white
 * card: soft shadows, a little grain, and a background that is *nearly* but not
 * exactly white. Dropped on the cream header as-is, each one shows up as a pale
 * rectangle. So every derivative goes through the same two steps first:
 *
 *   1. `-remap` onto a three-swatch palette (white, brand navy, brand green).
 *      Quantising to three colours would have merged navy and green into one
 *      teal — the quantiser optimises for pixel count, and the two darks are
 *      closer to each other than either is to the background. Remapping names
 *      the three colours we want instead of asking for a count.
 *   2. Key the white out and trim. Flattening throws away the anti-aliasing,
 *      but every derivative is a large downscale of a ~500px master, and the
 *      downscale filter puts smooth edges back.
 *
 * The icon tile is the exception: its mark is white *inside* a navy square, so
 * keying white would punch a hole through it. It stays opaque and is flattened
 * onto navy instead.
 *
 * Run: node scripts/build-brand-assets.mjs   (needs ImageMagick 7 on PATH)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'assets/brand/source');
const publicDir = join(root, 'public');
const brandDir = join(publicDir, 'brand');
const tmp = join(root, 'node_modules/.cache/brand-assets');

/* The two inks the masters are drawn in, sampled off the stacked lockup. */
const NAVY = '#0A2F55';
const GREEN = '#3D7D6B';
/* Reversed pair for the footer's #091e1e. Brand green at full strength sits at
 * 4:1 on that ground; lifted it clears 6:1 and still reads as the same green. */
const REVERSE_NAVY = '#F5F1E8';
const REVERSE_GREEN = '#5FA98F';

/*
 * The stacked master is mark over wordmark with a blank band between them;
 * 512 is the last row of the mark, measured off the trimmed file.
 */
const STACKED_MARK_HEIGHT = 512;
/* iOS's own corner radius, as a fraction of the tile. */
const TILE_RADIUS = 0.225;
/* The mark's share of the tile, matching the app-icon master. */
const TILE_MARK = 0.6;
/* Maskable art has to survive a circle crop: this keeps it inside the 80%. */
const TILE_MARK_MASKABLE = 0.46;

function magick(args) {
  execFileSync('magick', args, { stdio: ['ignore', 'inherit', 'inherit'] });
}

function size(file) {
  return execFileSync('magick', [file, '-format', '%wx%h', 'info:'], { encoding: 'utf8' });
}

function report(file) {
  const bytes = statSync(file).size;
  const kb = bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
  console.log(`  ${relative(root, file).padEnd(38)} ${size(file).padStart(9)}  ${kb}`);
}

rmSync(tmp, { recursive: true, force: true });
for (const dir of [tmp, brandDir]) mkdirSync(dir, { recursive: true });

/* The three-swatch palette every `-remap` below snaps to. */
const palette = join(tmp, 'palette.png');
magick([
  '-size', '3x1', 'xc:none',
  '-fill', '#FFFFFF', '-draw', 'point 0,0',
  '-fill', NAVY, '-draw', 'point 1,0',
  '-fill', GREEN, '-draw', 'point 2,0',
  palette,
]);

/** Trim the card margin, snap to the palette, drop the white, trim again. */
function flatten(name, input, crop) {
  const out = join(tmp, `${name}.png`);
  magick([
    input,
    '-fuzz', '8%', '-trim', '+repage',
    ...(crop ? ['-crop', crop, '+repage'] : []),
    '-remap', palette,
    '-transparent', 'white',
    '-fuzz', '8%', '-trim', '+repage',
    out,
  ]);
  return out;
}

/** Same art in the reversed pair, for dark surfaces. */
function reverse(name, input) {
  const out = join(tmp, `${name}.png`);
  magick([
    input,
    '-fill', REVERSE_GREEN, '-opaque', GREEN,
    '-fill', REVERSE_NAVY, '-opaque', NAVY,
    out,
  ]);
  return out;
}

/*
 * Full-alpha PNG, not PNG8: the art is only two colours and a palette would be
 * a third the size, but ImageMagick's PNG8 encoder writes binary transparency,
 * and binary transparency on a logo that is always painted at a quarter of its
 * stored size is a staircase along every diagonal in the mark.
 */
function emit(input, out, resize) {
  magick([
    input, '-resize', resize,
    '-strip', '-define', 'png:compression-level=9', '-define', 'png:compression-filter=5',
    out,
  ]);
  report(out);
}

console.log('lockups');
/*
 * Two horizontal masters arrived, near-identical at a glance and not at all
 * alike at 40px: `lockup-horizontal` sets a thinner mark a wide gap away from
 * the wordmark, and at header size the two halves stop reading as one object.
 * The compact one is the lockup, on light ground and dark alike — the light
 * and dark chrome have to be the same logo, so the other master stays in
 * `assets/brand/source` as an alternate rather than taking the footer.
 */
const lockup = flatten('lockup', join(source, 'lockup-horizontal-compact.png'));
/* 3x the 40px the header paints it at. */
emit(lockup, join(brandDir, 'costanswer-lockup.png'), 'x120');
emit(reverse('lockup-light', lockup), join(brandDir, 'costanswer-lockup-light.png'), 'x120');

console.log('app icons');
/*
 * The mark on its own is not published. Every surface that wants it wants it
 * on the navy tile, and the lockup covers the rest; it exists here as the
 * intermediate those tiles are built from.
 */
const mark = flatten('mark', join(source, 'lockup-stacked.png'), `10000x${STACKED_MARK_HEIGHT}+0+0`);
const markLight = reverse('mark-light', mark);

/*
 * The icon master is the design — reversed mark on a navy rounded square — but
 * not the artwork. Its tile is a render: 559x540 rather than square, sitting in
 * a soft drop shadow that no trim separates cleanly from the corners. Cropping
 * it gives a lopsided icon; forcing it square distorts the mark. So the tile is
 * drawn here at the exact size each platform asks for and the mark, taken from
 * the stacked master where its geometry is cleanest, is centred on it.
 */
const markRatio = (() => {
  const [w, h] = size(mark).split('x').map(Number);
  return w / h;
})();

/**
 * One icon: navy tile, reversed mark centred on it.
 * `rounded` cuts the corners out for tab favicons; iOS and Android mask their
 * own, and a transparent corner there shows as a dark fringe.
 */
function tileIcon(out, px, { rounded = false, markShare = TILE_MARK } = {}) {
  const markH = Math.round(px * markShare);
  const markW = Math.round(markH * markRatio);
  const radius = Math.round(px * TILE_RADIUS);
  magick([
    '-size', `${px}x${px}`, rounded ? 'xc:none' : `xc:${NAVY}`,
    ...(rounded
      ? ['-fill', NAVY, '-draw', `roundrectangle 0,0,${px - 1},${px - 1},${radius},${radius}`]
      : []),
    '(', markLight, '-resize', `${markW}x${markH}!`, ')',
    '-gravity', 'center', '-compose', 'over', '-composite',
    '-strip', '-define', 'png:compression-level=9',
    out,
  ]);
  report(out);
}

tileIcon(join(publicDir, 'apple-touch-icon.png'), 180);
tileIcon(join(publicDir, 'icon-192.png'), 192, { rounded: true });
tileIcon(join(publicDir, 'icon-512.png'), 512, { rounded: true });
tileIcon(join(publicDir, 'icon-512-maskable.png'), 512, { markShare: TILE_MARK_MASKABLE });
/* A tab favicon has ~16 pixels to say "C and an arrow in a hexagon" with, so
 * the mark takes more of the tile there than it does on a home screen. */
for (const px of [16, 32, 48]) {
  tileIcon(join(publicDir, `favicon-${px}x${px}.png`), px, { rounded: true, markShare: 0.7 });
}
const ico = join(publicDir, 'favicon.ico');
magick([
  join(publicDir, 'favicon-16x16.png'),
  join(publicDir, 'favicon-32x32.png'),
  join(publicDir, 'favicon-48x48.png'),
  ico,
]);
report(ico);

console.log('social card');
/*
 * The share card keeps its layout and swaps its wordmark: the lime text that
 * stood in for a logo is painted out in the card's own ink and the real
 * reversed lockup goes in its place, sized so its cap height matches the text
 * it replaces rather than its overall box.
 */
const og = join(publicDir, 'og.png');
const ogLockup = join(tmp, 'og-lockup.png');
magick([reverse('og-lockup-src', lockup), '-resize', 'x52', ogLockup]);
magick([
  join(root, 'assets/brand/og-base.png'),
  '-fill', '#102a2a', '-draw', 'rectangle 56,44 320,120',
  ogLockup, '-geometry', '+72+56', '-composite',
  '-strip', og,
]);
report(og);
