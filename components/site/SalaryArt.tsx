export const SALARY_ART_KINDS = [
  'nurse',
  'developer',
  'truck',
  'teacher',
  'electrician',
  'aide',
  'accountant',
  'admin',
  'pay-stub',
] as const;

export type SalaryArtKind = (typeof SALARY_ART_KINDS)[number];

export function SalaryArt({
  kind,
  priority = false,
}: {
  kind: SalaryArtKind;
  priority?: boolean;
}) {
  return (
    <img
      className={`category-art salary-art salary-art-${kind}`}
      src={`/salary/${kind}.svg`}
      alt=""
      width={64}
      height={64}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'low'}
      aria-hidden="true"
      draggable={false}
    />
  );
}
