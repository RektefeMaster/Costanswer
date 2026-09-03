import { categories, type CategoryId } from '@/lib/tool-registry';

export const categoryArtSrc: Record<CategoryId, string> = {
  money: '/categories/money.png',
  home: '/categories/home.png',
  auto: '/categories/auto.png',
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

export function CategoryChip({
  category,
  size = 'nav',
  tone = 'ink',
}: {
  category: CategoryId;
  size?: 'nav' | 'row';
  tone?: 'ink' | 'color';
}) {
  return (
    <span className={`nav-chip nav-chip-${size} nav-chip-${tone} accent-${categories[category].accent}`} aria-hidden="true" />
  );
}
