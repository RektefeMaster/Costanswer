'use client';

import { useLocale } from '@/components/i18n/LocaleProvider';
import { siteText } from '@/lib/i18n/site-copy';
import { useMemo, useState } from 'react';
import { calculateHsaContribution } from '@/lib/calculations/hsa';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { irsHsaLimits, irsHsaSnapshot, type HsaCoverage } from '@/lib/data/irs-hsa';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';

export function HsaContributionCalculator() {
  const locale = useLocale();
  const t = (text: string) => siteText(text, locale);
  const [coverage, setCoverage] = useState<HsaCoverage>('self-only');
  const [age, setAge] = useState('40');
  const [monthsEligible, setMonthsEligible] = useState('12');
  const [enrolledInMedicare, setEnrolledInMedicare] = useState(false);
  const [lastMonthRule, setLastMonthRule] = useState(false);
  const [alreadyContributed, setAlreadyContributed] = useState('0');
  const [planDeductible, setPlanDeductible] = useState('');
  const [planOutOfPocketMax, setPlanOutOfPocketMax] = useState('');

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateHsaContribution({
          coverage,
          age,
          monthsEligible,
          enrolledInMedicare,
          lastMonthRule,
          alreadyContributed,
          planDeductible: planDeductible.trim() === '' ? undefined : planDeductible,
          planOutOfPocketMax: planOutOfPocketMax.trim() === '' ? undefined : planOutOfPocketMax,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [coverage, age, monthsEligible, enrolledInMedicare, lastMonthRule, alreadyContributed, planDeductible, planOutOfPocketMax]);

  const value = calculation.result?.value;
  const family = coverage === 'family';

  return (
    <CalculatorPanel
      title={`How much can go into an HSA in ${irsHsaSnapshot.coverageYear}?`}
      intro="The cap is the IRS figure for the year, plus $1,000 if you are 55 or older, times the months you were actually eligible. Employer money counts."
      toolId="hsa-contribution"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([coverage, age, monthsEligible, enrolledInMedicare, lastMonthRule, alreadyContributed, planDeductible, planOutOfPocketMax])}
    >
      <div className="data-callout">
        <span>{irsHsaSnapshot.coverageYear} LIMITS</span>
        <p>
          <strong>IRS Revenue Procedure 2025-19</strong>
          <small>{irsHsaSnapshot.snapshotId}</small>
        </p>
      </div>
      <div className="mode-tabs" role="group" aria-label="HDHP coverage">
        <button type="button" aria-pressed={!family} className={!family ? 'active' : ''} onClick={() => setCoverage('self-only')}>Self-only</button>
        <button type="button" aria-pressed={family} className={family ? 'active' : ''} onClick={() => setCoverage('family')}>Family</button>
      </div>
      <div className="calc-form-grid">
        <Field label="Your age at year-end" htmlFor="hsa-age" hint="Catch-up starts the year you turn 55">
          <InputShell>
            <input id="hsa-age" type="number" min="16" max="120" step="1" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Months eligible this year" htmlFor="hsa-months" hint={enrolledInMedicare ? 'Count only months before Medicare enrollment (at most 11). Last-month rule cannot apply after that.' : 'Covered by a qualifying HDHP on the first day of the month'}>
          <InputShell suffix={t("months")}>
            <input id="hsa-months" type="number" min="0" max={enrolledInMedicare ? 11 : 12} step="1" inputMode="numeric" value={monthsEligible} onChange={(event) => setMonthsEligible(event.target.value)} disabled={lastMonthRule && !enrolledInMedicare} />
          </InputShell>
        </Field>
        <Field label="Already contributed this year" htmlFor="hsa-in" hint="Employee, employer, and anyone else, combined">
          <InputShell prefix="$">
            <input id="hsa-in" type="number" min="0" step="50" inputMode="decimal" value={alreadyContributed} onChange={(event) => setAlreadyContributed(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Medicare" htmlFor="hsa-medicare" hint="Turns off the last-month rule. It does not zero the year unless you enter zero eligible months.">
          <span className="input-shell select-shell">
            <select
              id="hsa-medicare"
              value={enrolledInMedicare ? 'yes' : 'no'}
              onChange={(event) => {
                const next = event.target.value === 'yes';
                setEnrolledInMedicare(next);
                if (next) {
                  setLastMonthRule(false);
                  if (monthsEligible === '12') setMonthsEligible('0');
                }
              }}
            >
              <option value="no">Not enrolled in Medicare</option>
              <option value="yes">Enrolled in any part of Medicare this year</option>
            </select>
          </span>
        </Field>
        <Field label="Last-month rule" htmlFor="hsa-last-month" hint={enrolledInMedicare ? 'Not available after Medicare enrollment.' : 'Full annual limit if eligible on 1 December, provided you stay eligible through next 31 December'}>
          <span className="input-shell select-shell">
            <select id="hsa-last-month" value={lastMonthRule && !enrolledInMedicare ? 'yes' : 'no'} onChange={(event) => setLastMonthRule(event.target.value === 'yes')} disabled={enrolledInMedicare}>
              <option value="no">No: prorate by months</option>
              <option value="yes">Yes: I am using the last-month rule</option>
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="hdhp-test" title="Check whether this plan is an HDHP" hint="Optional. The IRS test is on deductible and out-of-pocket maximum, not on the metal tier.">
        <div className="calc-form-grid">
          <Field label="Annual deductible" htmlFor="hsa-deductible" hint={`Minimum ${money(family ? irsHsaLimits.hdhpMinDeductibleFamily : irsHsaLimits.hdhpMinDeductibleSelfOnly, 0)}`}>
            <InputShell prefix="$">
              <input id="hsa-deductible" type="number" min="0" step="50" inputMode="decimal" value={planDeductible} onChange={(event) => setPlanDeductible(event.target.value)} />
            </InputShell>
          </Field>
          <Field label="Annual out-of-pocket maximum" htmlFor="hsa-oop" hint={`Maximum ${money(family ? irsHsaLimits.hdhpMaxOutOfPocketFamily : irsHsaLimits.hdhpMaxOutOfPocketSelfOnly, 0)}. Premiums do not count.`}>
            <InputShell prefix="$">
              <input id="hsa-oop" type="number" min="0" step="50" inputMode="decimal" value={planOutOfPocketMax} onChange={(event) => setPlanOutOfPocketMax(event.target.value)} />
            </InputShell>
          </Field>
        </div>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {value && calculation.result && (
        <>
          <PrimaryResult
            label={`${value.coverageYear} HSA contribution limit`}
            value={money(value.annualLimit, 0)}
            note={value.hdhpFailure ?? (value.enrolledInMedicare
              ? `${money(value.remaining, 0)} of room left. Medicare months do not count; last-month rule is off.`
              : `${money(value.remaining, 0)} of room left after what you already put in.`)}
          />
          <StatGrid items={[
            { label: family ? 'Family base limit' : 'Self-only base limit', value: money(value.baseLimit, 0) },
            { label: 'Age-55 catch-up', value: money(value.catchUp, 0) },
            { label: 'Room left', value: money(value.remaining, 0) },
            { label: 'HDHP test', value: value.qualifiesAsHdhp === null ? 'Not checked' : value.qualifiesAsHdhp ? 'Meets the IRS floors' : 'Does not qualify' },
          ]} />
          <ResultDetails
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
            headline={{ label: `${value.coverageYear} HSA limit`, value: money(value.annualLimit, 0) }}
          />
        </>
      )}
    </CalculatorPanel>
  );
}
