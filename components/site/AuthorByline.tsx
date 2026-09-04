import Link from 'next/link';
import { editorial } from '@/lib/editorial';

export function AuthorByline({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="author-byline author-byline-compact">
        <strong>{editorial.byline}</strong>
        <span>{editorial.role}</span>
      </p>
    );
  }

  return (
    <div className="author-byline">
      <p className="rail-kicker">Who maintains this</p>
      <h2>{editorial.byline}</h2>
      <p>{editorial.identity}</p>
      <p className="author-byline-links">
        <Link href={editorial.aboutPath}>About</Link>
        <span aria-hidden="true"> · </span>
        <Link href={editorial.methodologyPath}>Methodology</Link>
        <span aria-hidden="true"> · </span>
        <Link href={editorial.contactPath}>Contact</Link>
      </p>
    </div>
  );
}
