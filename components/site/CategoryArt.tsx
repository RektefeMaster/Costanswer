import { categories, type CategoryId } from '@/lib/categories';

export const categoryArtSrc: Record<CategoryId, string> = {
  money: '/categories/money.png',
  home: '/categories/home.png',
  car: '/categories/car.png',
  everyday: '/categories/everyday.png',
  food: '/categories/food.png',
  shopping: '/categories/shopping.png',
  health: '/categories/health.svg',
  math: '/categories/math.svg',
  education: '/categories/education.svg',
};

export function CategoryArt({
  category,
  priority = false,
}: {
  category: CategoryId;
  priority?: boolean;
}) {
  return (
    <img
      className={`category-art category-art-${category}`}
      src={categoryArtSrc[category]}
      alt=""
      width={520}
      height={520}
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
