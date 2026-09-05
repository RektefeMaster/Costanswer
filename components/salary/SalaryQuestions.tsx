import type { OccupationWageProfile } from '@/lib/calculations/salary';
import { occupationAliases, occupationHeadingName, salaryQuestions } from '@/lib/salary-content';

/**
 * The questions, as visible text.
 *
 * `FAQPage` markup is only added because these are on the page — structured
 * data for questions a reader cannot see is what gets a site's rich results
 * withdrawn. The headings carry the question wording so the page answers the
 * search in the words it was made in.
 */
export function SalaryQuestions({ profile }: { profile: OccupationWageProfile }) {
  const questions = salaryQuestions(profile);
  if (questions.length === 0) return null;
  return (
    <section className="editorial-section salary-questions" aria-labelledby="questions-title">
      <p className="eyebrow muted"><span /> Common questions</p>
      <h2 id="questions-title">{`${occupationHeadingName(profile.occupation)} pay in ${profile.areaLabel}, answered`}</h2>
      <div className="editorial-faq">
        {questions.map((entry) => (
          <article key={entry.question}>
            <h3>{entry.question}</h3>
            {entry.answer.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * What else the job is called, and what BLS calls it.
 *
 * Both directions matter. A reader who searched "RN" should see their word on
 * the page; a reader checking the figure against BLS should find the official
 * title the survey used, because the heading deliberately does not use it.
 */
export function OccupationNames({ profile }: { profile: OccupationWageProfile }) {
  const aliases = occupationAliases(profile.occupation);
  const officialDiffers = profile.occupation.title !== profile.occupation.displayTitle;
  if (aliases.length === 0 && !officialDiffers) return null;
  return (
    <p className="occupation-names">
      {aliases.length > 0 && (
        <>
          <strong>Also called</strong>{' '}
          {aliases.join(', ')}.{' '}
        </>
      )}
      {officialDiffers && (
        <>
          <strong>BLS records this occupation as</strong>{' '}
          “{profile.occupation.title}” (SOC {profile.occupation.code}).
        </>
      )}
      {!officialDiffers && <>SOC {profile.occupation.code}.</>}
    </p>
  );
}
