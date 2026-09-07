import { categories, type CategoryId } from '@/lib/categories';

/*
 * WebP, at the resolution these are actually painted.
 *
 * Six of these are raster art. As 720px PNGs they were 1.1 MB the home page
 * downloaded on every cold visit — for decoration drawn at `opacity: .2`
 * behind a category card, never wider than 320 CSS pixels. Re-encoded at 640px
 * (2x the widest render) they are 229 KB, and at a fifth opacity the
 * difference is not visible. The three vector ones were already small and stay
 * SVG.
 */
type CategoryArtAsset = { readonly src: string; readonly width: number; readonly height: number };

/*
 * Each file's own pixels, not a square guess.
 *
 * The element used to declare 520x520 for art that is 640x221 (car) through
 * 640x665 (home). With `height: auto` the browser reserves the declared ratio
 * until the bytes arrive and the real one after, so a wrong ratio is a reflow
 * waiting to happen — harmless only because the art is absolutely positioned.
 * Stating the true size costs nothing and removes the trap for whoever moves
 * one of these into normal flow.
 */
export const CATEGORY_ART: Record<CategoryId, CategoryArtAsset> = {
  money: { src: '/categories/money.webp', width: 640, height: 556 },
  home: { src: '/categories/home.webp', width: 640, height: 665 },
  car: { src: '/categories/car.webp', width: 640, height: 221 },
  everyday: { src: '/categories/everyday.webp', width: 640, height: 540 },
  food: { src: '/categories/food.webp', width: 640, height: 584 },
  shopping: { src: '/categories/shopping.webp', width: 640, height: 631 },
  health: { src: '/categories/health.svg', width: 64, height: 64 },
  math: { src: '/categories/math.svg', width: 64, height: 64 },
  education: { src: '/categories/education.svg', width: 64, height: 64 },
};

export function CategoryArt({
  category,
  priority = false,
}: {
  category: CategoryId;
  priority?: boolean;
}) {
  // Decorative local static files; the Worker deploy has no image optimizer.
  const asset = CATEGORY_ART[category];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`category-art category-art-${category}`}
      src={asset.src}
      alt=""
      width={asset.width}
      height={asset.height}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'low'}
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function NavChip() {
  return (
    <span className="nav-chip nav-chip-nav nav-chip-ink" aria-hidden="true">
      <svg className="nav-check" viewBox="0 0 40 40" fill="none">
        <path className="nav-check-short" pathLength="1" d="M5.2 18.4c1.8 1.6 4.8 7.2 7.4 13.2" />
        <path className="nav-check-long" pathLength="1" d="M11.6 31.2C18.4 16.8 27.6 6.4 38.8 2.6" />
      </svg>
    </span>
  );
}

export function CategoryChip({
  category,
  size = 'nav',
  tone = 'ink',
}: {
  category: CategoryId;
  size?: 'nav' | 'row';
  tone?: 'ink' | 'color';
}) {
  if (tone === 'ink') return <NavChip />;
  return (
    <span className={`nav-chip nav-chip-${size} nav-chip-color accent-${categories[category].accent}`} aria-hidden="true" />
  );
}
