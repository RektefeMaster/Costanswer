import Link from 'next/link';
import { formatNumber } from '@/lib/calculations/contracts';
import { salaryHubPayLabel, salaryHubPayNote, type SalaryHubGroup, type SalaryHubOccupation } from '@/lib/salary-hub-view';

export function SalaryOccupationList({
  occupations,
  ranked = false,
}: {
  occupations: readonly SalaryHubOccupation[];
  ranked?: boolean;
}) {
  return (
    <ul className={ranked ? 'salary-hub-jobs is-ranked' : 'salary-hub-jobs'}>
      {occupations.map((occupation) => (
        <li key={occupation.code}>
          <Link href={occupation.path}>
            <span className="salary-hub-job-name">{occupation.name}</span>
            <span className="salary-hub-job-pay">{salaryHubPayLabel(occupation)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SalaryFeatured({ featured }: { featured: readonly SalaryHubOccupation[] }) {
  if (featured.length === 0) return null;
  return (
    <section className="salary-hub-featured" aria-labelledby="salary-featured-title">
      <p className="eyebrow muted"><span /> Common jobs</p>
      <h2 id="salary-featured-title">Start with a job people actually search</h2>
      <ul className="salary-hub-featured-grid">
        {featured.map((occupation) => (
          <li key={occupation.code}>
            <Link href={occupation.path}>
              <strong>{occupation.name}</strong>
              <b>{salaryHubPayLabel(occupation)}</b>
              <small>{salaryHubPayNote(occupation)}</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SalaryGroupCatalog({ groups }: { groups: readonly SalaryHubGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <section
          className="related-section salary-hub-group"
          aria-labelledby={`group-${group.majorCode}-title`}
          id={`group-${group.majorCode}`}
          key={group.majorCode}
        >
          <p className="eyebrow muted"><span /> {`SOC ${group.majorCode} · ${formatNumber(group.members.length)}`}</p>
          <h2 id={`group-${group.majorCode}-title`}>{group.title}</h2>
          <SalaryOccupationList occupations={group.members} />
        </section>
      ))}
    </>
  );
}
