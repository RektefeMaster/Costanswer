'use client';

import { useMemo, useState } from 'react';
import { calculateRmd } from '@/lib/calculations/rmd';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { irsRmdSnapshot } from '@/lib/data/irs-rmd';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';

export function RmdCalculator() {
  const year = irsRmdSnapshot.distributionYear;
  const [balance, setBalance] = useState('500000');
  const [age, setAge] = useState('75');
  const [birthYear, setBirthYear] = useState('1951');
  const [inherited, setInherited] = useState(false);
  const [spouseYounger, setSpouseYounger] = useState(false);
  const [rothIra, setRothIra] = useState(false);

  const calculation = useMemo(() => {
    try {
      return {
        result: calculateRmd({
          priorYearEndBalance: balance,
          age,
          birthYear,
          inherited,
          spouseMoreThanTenYearsYounger: spouseYounger,
          rothIra,
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [balance, age, birthYear, inherited, spouseYounger, rothIra]);

  const value = calculation.result?.value;
  const impliedAge = year - Number(birthYear);
  const ageDisagrees = Number.isFinite(impliedAge) && Number(age) !== impliedAge;
  const headline = value?.blockedReason
    ? 'Not computed from Table III'
    : value?.required
      ? `${year} required minimum`
      : `${year} RMD`;

  return (
    <CalculatorPanel
      title={`Required minimum distribution for ${year}`}
      intro="Last year’s ending balance divided by the Uniform Lifetime factor for your age this year. The starting age is 73 or 75, from SECURE 2.0, not from the table."
      toolId="rmd"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([balance, age, birthYear, inherited, spouseYounger, rothIra])}
    >
      <div className="data-callout">
        <span>{year} DISTRIBUTIONS</span>
        <p>
          <strong>IRS Publication 590-B, Table III (Uniform Lifetime)</strong>
          <small>{irsRmdSnapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label={`${year - 1} year-end account balance`} htmlFor="rmd-balance" hint="Traditional IRA, or the inherited account if you marked that below">
          <InputShell prefix="$">
            <input id="rmd-balance" type="number" min="0" step="1000" inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} />
          </InputShell>
        </Field>
        <Field
          label={`Age as of your birthday in ${year}`}
          htmlFor="rmd-age"
          hint={ageDisagrees ? `Birth year ${birthYear} is age ${impliedAge} in ${year}. IRS uses that birthday age; the table still uses ${age}.` : undefined}
        >
          <InputShell>
            <input id="rmd-age" type="number" min="18" max="120" step="1" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Birth year" htmlFor="rmd-birth" hint="Used only to pick 73 or 75 as the starting age">
          <InputShell>
            <input id="rmd-birth" type="number" min="1900" max="2020" step="1" inputMode="numeric" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Whose IRA is this?" htmlFor="rmd-whose">
          <span className="input-shell select-shell">
            <select
              id="rmd-whose"
              value={rothIra ? 'roth' : inherited ? 'inherited' : 'own'}
              onChange={(event) => {
                const next = event.target.value;
                setRothIra(next === 'roth');
                setInherited(next === 'inherited');
              }}
            >
              <option value="own">Traditional IRA I own</option>
              <option value="roth">Roth IRA I own</option>
              <option value="inherited">An IRA I inherited</option>
            </select>
          </span>
        </Field>
        <Field label="Sole beneficiary" htmlFor="rmd-spouse" hint="Table II, not Table III, if a spouse more than 10 years younger is the sole beneficiary">
          <span className="input-shell select-shell">
            <select id="rmd-spouse" value={spouseYounger ? 'yes' : 'no'} onChange={(event) => setSpouseYounger(event.target.value === 'yes')}>
              <option value="no">Not that case</option>
              <option value="yes">Spouse more than 10 years younger is the sole beneficiary</option>
            </select>
          </span>
        </Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {value && calculation.result && (
        <>
          <PrimaryResult
            label={headline}
            value={value.rmd === null ? 'See the note' : money(value.rmd, 0)}
            note={value.blockedReason ?? (value.required
              ? `Table III factor ${value.denominator} for age ${value.age}.`
              : `No lifetime RMD until the year you reach ${value.startAge}.`)}
          />
          <StatGrid items={[
            { label: 'Starting age', value: String(value.startAge) },
            { label: 'Table III factor', value: value.denominator === null ? '—' : value.denominator.toFixed(1) },
            { label: `${year - 1} balance`, value: money(Number(balance) || 0, 0) },
          ]} />
          <ResultDetails
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
            headline={{ label: headline, value: value.rmd === null ? 'Not computed' : money(value.rmd, 0) }}
          />
        </>
      )}
    </CalculatorPanel>
  );
}
