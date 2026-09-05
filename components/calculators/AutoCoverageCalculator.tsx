'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { calculateAutoCoverage } from '@/lib/calculations/auto-coverage';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { insuranceSnapshot } from '@/lib/data/insurance-snapshot';
import { STATE_CODES, US_STATES, type StateCode } from '@/lib/location/states';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';

export function AutoCoverageCalculator() {
  const [stateCode, setStateCode] = useState<StateCode>('TX');
  const [vehicleValue, setVehicleValue] = useState('6000');
  const [collisionDeductible, setCollisionDeductible] = useState('1000');
  const [comprehensiveDeductible, setComprehensiveDeductible] = useState('500');
  const [premiumBasis, setPremiumBasis] = useState<'benchmark' | 'custom'>('benchmark');
  const [annualCollisionPremium, setAnnualCollisionPremium] = useState('');
  const [annualComprehensivePremium, setAnnualComprehensivePremium] = useState('');

  const input = useMemo(() => ({
    stateCode, vehicleValue, collisionDeductible, comprehensiveDeductible, premiumBasis,
    annualCollisionPremium, annualComprehensivePremium,
  }), [stateCode, vehicleValue, collisionDeductible, comprehensiveDeductible, premiumBasis, annualCollisionPremium, annualComprehensivePremium]);

  const calculation = useMemo(() => {
    try { return { result: calculateAutoCoverage(input), error: '' }; }
    catch (error) { return { result: null, error: calculationErrorMessage(error) }; }
  }, [input]);

  const result = calculation.result;
  const value = result?.value;

  return (
    <CalculatorPanel
      title="What collision and comprehensive can return"
      intro="These two coverages pay what your car is worth, less the deductible. The premium is not capped by anything. This shows both numbers side by side."
      toolId="auto-coverage"
      category="car"
      calculationState={result ? 'complete' : 'invalid'}
      calculationSignature={JSON.stringify(input)}
    >
      <div className="data-callout">
        <span>NAIC {insuranceSnapshot.observationPeriod}</span>
        <p>
          <strong>Average written premium per insured car-year</strong>
          <small>{insuranceSnapshot.snapshotId}</small>
        </p>
      </div>
      <div className="calc-form-grid">
        <Field label="State" htmlFor="coverage-state" hint="Sets the published collision and comprehensive averages. Your address is not collected.">
          <span className="input-shell select-shell">
            <select id="coverage-state" value={stateCode} onChange={(event) => setStateCode(event.target.value as StateCode)}>
              {STATE_CODES.map((code) => <option key={code} value={code}>{US_STATES[code]}</option>)}
            </select>
          </span>
        </Field>
        <Field label="What the car is worth today" htmlFor="coverage-value" hint="Actual cash value: what it would sell for now. Not what you paid, and not the loan balance.">
          <InputShell prefix="$">
            <input id="coverage-value" type="number" min="0" max="500000" step="500" value={vehicleValue} onChange={(event) => setVehicleValue(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Collision deductible" htmlFor="coverage-collision-deductible" hint="What you pay before collision cover starts, on a crash you cause.">
          <InputShell prefix="$">
            <input id="coverage-collision-deductible" type="number" min="0" max="25000" step="250" value={collisionDeductible} onChange={(event) => setCollisionDeductible(event.target.value)} />
          </InputShell>
        </Field>
        <Field label="Comprehensive deductible" htmlFor="coverage-comprehensive-deductible" hint="For theft, hail, flood, fire, and animal strikes. Often lower than the collision one.">
          <InputShell prefix="$">
            <input id="coverage-comprehensive-deductible" type="number" min="0" max="25000" step="250" value={comprehensiveDeductible} onChange={(event) => setComprehensiveDeductible(event.target.value)} />
          </InputShell>
        </Field>
      </div>

      <details className="health-advanced">
        <summary>Use your own premiums <span>Read them off your declarations page</span></summary>
        <div className="calc-form-grid">
          <Field label="Premium source" htmlFor="coverage-basis">
            <span className="input-shell select-shell">
              <select id="coverage-basis" value={premiumBasis} onChange={(event) => setPremiumBasis(event.target.value as 'benchmark' | 'custom')}>
                <option value="benchmark">Published state average</option>
                <option value="custom">My own premiums</option>
              </select>
            </span>
          </Field>
          {premiumBasis === 'custom' && <>
            <Field label="Collision, per year" htmlFor="coverage-collision-premium" hint="The collision line only, not the whole policy.">
              <InputShell prefix="$">
                <input id="coverage-collision-premium" type="number" min="0" max="100000" step="25" value={annualCollisionPremium} onChange={(event) => setAnnualCollisionPremium(event.target.value)} />
              </InputShell>
            </Field>
            <Field label="Comprehensive, per year" htmlFor="coverage-comprehensive-premium" hint="The comprehensive line only. Add both six-month figures together.">
              <InputShell prefix="$">
                <input id="coverage-comprehensive-premium" type="number" min="0" max="100000" step="25" value={annualComprehensivePremium} onChange={(event) => setAnnualComprehensivePremium(event.target.value)} />
              </InputShell>
            </Field>
          </>}
        </div>
      </details>

      {calculation.error && <InlineError message={calculation.error} />}
      {result && value && (
        <div className="calculation-output">
          <PrimaryResult
            label={value.coverageIsWorthless ? 'This cover cannot pay out on a total loss' : 'Years of premium to equal a total-loss payout'}
            value={value.yearsOfPremiumToEqualPayout === null ? 'None' : formatNumber(value.yearsOfPremiumToEqualPayout, { maximumFractionDigits: 1 })}
            note={value.coverageIsWorthless
              ? `A deductible of ${formatMoney(value.worthlessBelowValue, 0)} is at or above the car's value`
              : `${formatMoney(value.annualPhysicalDamagePremium)} a year against ${formatMoney(Math.max(value.collisionMaximumPayout, value.comprehensiveMaximumPayout), 0)} of cover`}
          />

          {/*
            Two states worth calling out, and neither is advice. A deductible at
            or above the car's value makes the cover unable to pay anything; a
            ceiling under ten years of premium is the point at which most people
            would want to look at the trade rather than renew without thinking.
          */}
          {value.coverageIsWorthless ? (
            <div className="health-status health-status-review" role="status">
              <span>The deductible has overtaken the car</span>
              <ul>
                <li>Collision and comprehensive pay the car&rsquo;s value less the deductible. At {formatMoney(Number(vehicleValue) || 0, 0)} against a {formatMoney(value.worthlessBelowValue, 0)} deductible, a total loss returns nothing, so these two coverages are paying for a benefit they cannot deliver.</li>
                <li>Liability is a separate matter and is required almost everywhere. Nothing here suggests dropping it.</li>
              </ul>
            </div>
          ) : value.payoutBelowTenTimesPremium && (
            <div className="health-status health-status-review" role="status">
              <span>The ceiling is close to the cost</span>
              <ul>
                <li>
                  A year of collision and comprehensive costs {formatMoney(value.annualPhysicalDamagePremium)}, and the most either can ever pay is {formatMoney(Math.max(value.collisionMaximumPayout, value.comprehensiveMaximumPayout), 0)}.
                  That is {formatNumber(value.yearsOfPremiumToEqualPayout ?? 0, { maximumFractionDigits: 1 })} years of premium for the whole benefit, and the benefit shrinks every year as the car does.
                </li>
                <li>Whether that is worth buying depends on whether you could replace the car out of savings, which is a judgement this page cannot make for you.</li>
              </ul>
            </div>
          )}

          <StatGrid items={[
            { label: 'Collision + comprehensive / year', value: formatMoney(value.annualPhysicalDamagePremium), note: value.usesBenchmark ? `${value.observationPeriod} ${value.stateName} average` : 'Your entered premiums' },
            { label: 'Most it can ever pay', value: formatMoney(Math.max(value.collisionMaximumPayout, value.comprehensiveMaximumPayout), 0), note: 'Car value less the deductible, falling every year' },
            {
              label: 'Premium as a share of the car',
              value: value.premiumAsPercentOfValue === null ? 'n/a' : `${formatNumber(value.premiumAsPercentOfValue, { maximumFractionDigits: 1 })}%`,
              note: 'Annual cost measured against what is being covered',
            },
          ]} />

          {value.usesBenchmark && value.annualLiabilityPremium !== null && (
            <p className="health-range-note">
              For comparison, liability alone averaged <strong>{formatMoney(value.annualLiabilityPremium)}</strong> a year in {value.stateName} in {value.observationPeriod}.
              Liability pays other people and is required in almost every state; its worth is not capped by what your own car is worth, so it is not part of the comparison above.
            </p>
          )}

          <ResultDetails
            breakdown={result.breakdown}
            assumptions={result.assumptions}
            calculationVersion={result.calculationVersion}
            datasetSnapshotIds={result.datasetSnapshotIds}
          />
          <p className="health-range-note">
            Budgeting for the whole policy rather than one decision? The <Link href="/money/insurance-cost">insurance cost calculator →</Link> adds home and auto together.
          </p>
        </div>
      )}
    </CalculatorPanel>
  );
}
