'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateLoanLimit } from '@/lib/calculations/loan-limit';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { countyFromView, type LoanLimitCountyView } from '@/lib/data/fhfa-loan-limits';
import { AdvancedSection, CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from '../CalculatorUI';
import { money } from '../finance-format';

type ZipResolution =
  | { status: 'not-a-zcta'; zip: string; message: string }
  | { status: 'resolved'; zip: string; counties: LoanLimitCountyView[]; split: boolean; message?: string };

const UNIT_OPTIONS = [1, 2, 3, 4] as const;

export function LoanLimitCalculator({
  snapshotId,
  loanYear,
  baseline,
  states,
  defaultCounty,
}: {
  snapshotId: string;
  loanYear: number;
  baseline: [number, number, number, number];
  states: Array<{ code: string; name: string }>;
  defaultCounty: LoanLimitCountyView;
}) {
  const [state, setState] = useState(defaultCounty.state);
  const [counties, setCounties] = useState<LoanLimitCountyView[]>([defaultCounty]);
  const [countyFips, setCountyFips] = useState(defaultCounty.fips);
  const [units, setUnits] = useState<(typeof UNIT_OPTIONS)[number]>(1);
  const [loanAmount, setLoanAmount] = useState('400000');
  const [downPaymentPercent, setDownPaymentPercent] = useState('20');
  const [zip, setZip] = useState('');
  const [zipNote, setZipNote] = useState('');
  const [listError, setListError] = useState('');

  const selected = counties.find((county) => county.fips === countyFips) ?? counties[0] ?? defaultCounty;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/loan-limit/lookup?state=${encodeURIComponent(defaultCounty.state)}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? await response.json() as { counties?: LoanLimitCountyView[] } : {}))
      .then((body) => {
        if (controller.signal.aborted || !body.counties?.length) return;
        setCounties(body.counties);
        setCountyFips((current) => (body.counties!.some((county) => county.fips === current) ? current : body.counties![0].fips));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [defaultCounty.state]);

  const loadState = (nextState: string) => {
    setState(nextState);
    setListError('');
    fetch(`/api/loan-limit/lookup?state=${encodeURIComponent(nextState)}`)
      .then(async (response) => (response.ok ? await response.json() as { counties?: LoanLimitCountyView[] } : {}))
      .then((body) => {
        const next = body.counties ?? [];
        setCounties(next);
        setCountyFips(next[0]?.fips ?? '');
        if (next.length === 0) setListError('No counties loaded for that state. Try another, or a ZIP code.');
      })
      .catch(() => setListError('The county list could not be loaded. Try again, or pick another state.'));
  };

  const zipQuery = /^\d{5}$/.test(zip.trim());
  const visibleZipNote = zipQuery ? zipNote : '';

  useEffect(() => {
    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/loan-limit/lookup?zip=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (response) => (response.ok ? await response.json() as { resolution?: ZipResolution } : {}))
        .then((body) => {
          if (controller.signal.aborted) return;
          const resolution = body.resolution;
          if (!resolution) {
            setZipNote('This ZIP could not be looked up. Pick the county by name.');
            return;
          }
          if (resolution.status !== 'resolved') {
            setZipNote(resolution.message);
            return;
          }
          setCounties(resolution.counties);
          setCountyFips(resolution.counties[0].fips);
          setState(resolution.counties[0].state);
          setZipNote(resolution.message ?? `${resolution.counties[0].name}, ${resolution.counties[0].state}.`);
        })
        .catch(() => {
          if (!controller.signal.aborted) setZipNote('This ZIP could not be looked up. Pick the county by name.');
        });
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [zip]);

  const calculation = useMemo(() => {
    if (!selected) return { result: null, error: 'Pick a county.' };
    try {
      return {
        result: calculateLoanLimit(
          {
            loanAmount,
            units,
            downPaymentPercent: downPaymentPercent.trim() === '' ? undefined : downPaymentPercent,
          },
          countyFromView(selected),
          baseline,
          snapshotId,
          loanYear,
        ),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [selected, loanAmount, units, downPaymentPercent, baseline, snapshotId, loanYear]);

  const value = calculation.result?.value;
  const bandNote = value?.band === 'jumbo'
    ? `${money(value.additionalDownPaymentToConform, 0)} more down would bring this loan under the county limit.`
    : value?.band === 'high-balance-conforming'
      ? 'Still agency-eligible, with a high-balance price adjustment on top of a baseline conforming loan.'
      : value?.isSpecialStatutoryArea
        ? 'At or under the statutory 150% baseline for Alaska, Hawaii, Guam, or the U.S. Virgin Islands.'
        : 'At or under the national baseline for this unit count.';

  return (
    <CalculatorPanel
      title={`Is this loan conforming in ${loanYear}?`}
      intro="The limit is on the loan amount, not the purchase price. High-balance is still conforming. Jumbo is not."
      toolId="conforming-loan-limit"
      category="money"
      calculationState={calculation.result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify([countyFips, units, loanAmount, downPaymentPercent])}
    >
      <div className="data-callout">
        <span>{loanYear} FHFA LIMITS</span>
        <p>
          <strong>Conforming loan limit values for loans acquired in {loanYear}</strong>
          <small>{snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="State" htmlFor="loan-limit-state">
          <span className="input-shell select-shell">
            <select
              id="loan-limit-state"
              value={state}
              onChange={(event) => {
                setZip('');
                setZipNote('');
                loadState(event.target.value);
              }}
            >
              {states.map((row) => (
                <option key={row.code} value={row.code}>{row.name}</option>
              ))}
            </select>
          </span>
        </Field>
        <Field label="County" htmlFor="loan-limit-county" hint={visibleZipNote || listError || undefined}>
          <span className="input-shell select-shell">
            <select
              id="loan-limit-county"
              value={countyFips}
              onChange={(event) => setCountyFips(event.target.value)}
            >
              {counties.map((county) => (
                <option key={county.fips} value={county.fips}>{county.name}</option>
              ))}
            </select>
          </span>
        </Field>
        <Field label="Loan amount" htmlFor="loan-limit-amount" hint="The financed amount, not the purchase price">
          <InputShell prefix="$">
            <input id="loan-limit-amount" type="number" min="0" step="1000" inputMode="decimal" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Units" htmlFor="loan-limit-units" hint="1–4 unit residential property">
          <span className="input-shell select-shell">
            <select id="loan-limit-units" value={units} onChange={(event) => setUnits(Number(event.target.value) as (typeof UNIT_OPTIONS)[number])}>
              {UNIT_OPTIONS.map((count) => (
                <option key={count} value={count}>{count}-unit</option>
              ))}
            </select>
          </span>
        </Field>
      </div>
      <AdvancedSection id="zip-and-price" title="ZIP code and largest conforming price" hint="A ZIP is mapped to a county. Down payment is only used to show the largest conforming purchase price.">
        <div className="calc-form-grid">
          <Field label="ZIP code" htmlFor="loan-limit-zip" hint="Optional. A ZIP is mapped to a county; it is not an FHFA field.">
            <InputShell>
              <input
                id="loan-limit-zip"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                placeholder="75201"
              />
            </InputShell>
          </Field>
          <Field label="Down payment" htmlFor="loan-limit-down" hint="Used only to show the largest conforming purchase price">
            <InputShell suffix="%">
              <input id="loan-limit-down" type="number" min="0" max="100" step="1" inputMode="decimal" value={downPaymentPercent} onChange={(event) => setDownPaymentPercent(event.target.value)} />
            </InputShell>
          </Field>
        </div>
      </AdvancedSection>
      {calculation.error && <InlineError message={calculation.error} />}
      {value && calculation.result && (
        <>
          <PrimaryResult label="This loan is" value={value.bandLabel} note={bandNote} />
          <StatGrid items={[
            { label: `${selected.name} ${units}-unit limit`, value: money(value.countyLimit, 0) },
            { label: value.headroom >= 0 ? 'Room under the limit' : 'Over the limit', value: money(Math.abs(value.headroom), 0) },
            { label: value.isSpecialStatutoryArea && value.areaBaselineLimit !== value.baselineLimit ? `${selected.state} statutory baseline` : 'National baseline', value: money(value.isSpecialStatutoryArea ? value.areaBaselineLimit : value.baselineLimit, 0) },
            ...(value.maximumConformingPrice !== null
              ? [{ label: `Largest conforming price at ${downPaymentPercent}% down`, value: money(value.maximumConformingPrice, 0) }]
              : []),
          ]} />
          <ResultDetails
            breakdown={calculation.result.breakdown}
            assumptions={calculation.result.assumptions}
            calculationVersion={calculation.result.calculationVersion}
            datasetSnapshotIds={calculation.result.datasetSnapshotIds}
            headline={{ label: 'This loan is', value: value.bandLabel }}
          />
        </>
      )}
    </CalculatorPanel>
  );
}
