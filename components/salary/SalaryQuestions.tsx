import type { OccupationWageProfile } from '@/lib/calculations/salary';
import { occupationAliases, occupationHeadingName, salaryQuestions } from '@/lib/salary-content';
import { occupationAliasesEs, occupationHeadingEs, salaryQuestionsEs } from '@/lib/salary-content-es';
import type { Locale } from '@/lib/i18n/locales';
import { stateAreaLabelEs } from '@/lib/location/states-es';
import { wageUi } from '@/lib/salary/wage-ui';

export function SalaryQuestions({ profile, locale = 'en-US' }: { profile: OccupationWageProfile; locale?: Locale }) {
  const questions = locale === 'es-US' ? salaryQuestionsEs(profile) : salaryQuestions(profile);
  if (questions.length === 0) return null;
  const where = locale === 'es-US' ? stateAreaLabelEs(profile.area) : profile.areaLabel;
  const heading = locale === 'es-US'
    ? `${occupationHeadingEs(profile.occupation)} en ${where}, en preguntas`
    : `${occupationHeadingName(profile.occupation)} pay in ${profile.areaLabel}, answered`;
  return (
    <section className="editorial-section salary-questions" aria-labelledby="questions-title">
      <p className="eyebrow muted"><span /> {wageUi('questionsKicker', locale)}</p>
      <h2 id="questions-title">{heading}</h2>
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

export function OccupationNames({ profile, locale = 'en-US' }: { profile: OccupationWageProfile; locale?: Locale }) {
  const aliases = locale === 'es-US' ? occupationAliasesEs(profile.occupation) : occupationAliases(profile.occupation);
  const officialDiffers = profile.occupation.title !== profile.occupation.displayTitle;
  if (aliases.length === 0 && !officialDiffers) return null;
  return (
    <p className="occupation-names">
      {aliases.length > 0 && (
        <>
          <strong>{wageUi('alsoCalled', locale)}</strong>{' '}
          {aliases.join(', ')}.{' '}
        </>
      )}
      {officialDiffers && (
        <>
          <strong>{wageUi('blsRecords', locale)}</strong>{' '}
          “{profile.occupation.title}” (SOC {profile.occupation.code}).
        </>
      )}
      {!officialDiffers && <>SOC {profile.occupation.code}.</>}
    </p>
  );
}
