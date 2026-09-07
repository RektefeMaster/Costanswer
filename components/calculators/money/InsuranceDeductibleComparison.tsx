'use client';

import { useMemo, useState } from 'react';
import { calculateDeductibleComparison } from '@/lib/calculations/insurance';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { formatMoney, formatNumber } from '@/lib/calculations/contracts';
import { Field, InlineError, InputShell, ResultDetails } from '../CalculatorUI';

export function InsuranceDeductibleComparison() {
  const [annualPremiumA, setAnnualPremiumA] = useState('1800');
  const [annualPremiumB, setAnnualPremiumB] = useState('1500');
  const [deductibleA, setDeductibleA] = useState('500');
  const [deductibleB, setDeductibleB] = useState('1500');
  const [coveredLossAmount, setCoveredLossAmount] = useState('5000');
  const calculation = useMemo(() => {
    try { return { result: calculateDeductibleComparison({ annualPremiumA, annualPremiumB, deductibleA, deductibleB, coveredLossAmount }), error: '' }; }
    catch (error) { return { result: null, error: calculationErrorMessage(error) }; }
  }, [annualPremiumA, annualPremiumB, deductibleA, deductibleB, coveredLossAmount]);
  const result = calculation.result;

  return <details className="insurance-deductibles">
    <summary>Compare two deductibles <span>Premium savings versus claim costs</span></summary>
    <p className="insurance-section-intro">Use two quotes with the same coverage. The starting numbers below are an editable example, independent of your budget above.</p>
    <div className="insurance-quote-grid">
      {([
        { label: 'Policy A', suffix: 'a', premium: annualPremiumA, deductible: deductibleA, setPremium: setAnnualPremiumA, setDeductible: setDeductibleA },
        { label: 'Policy B', suffix: 'b', premium: annualPremiumB, deductible: deductibleB, setPremium: setAnnualPremiumB, setDeductible: setDeductibleB },
      ]).map((policy) => <fieldset key={policy.suffix}><legend>{policy.label}</legend>
        <Field label="Annual premium" htmlFor={`deductible-premium-${policy.suffix}`}><InputShell prefix="$"><input id={`deductible-premium-${policy.suffix}`} type="number" min="0" max="1000000" step="50" value={policy.premium} onChange={(event) => policy.setPremium(event.target.value)} /></InputShell></Field>
        <Field label="Deductible in dollars" htmlFor={`deductible-${policy.suffix}`}><InputShell prefix="$"><input id={`deductible-${policy.suffix}`} type="number" min="0" max="1000000" step="100" value={policy.deductible} onChange={(event) => policy.setDeductible(event.target.value)} /></InputShell></Field>
      </fieldset>)}
    </div>
    <div className="calc-form-grid compact-grid"><Field label="One covered loss to compare" htmlFor="deductible-loss" hint="Assumes this loss is fully covered above the deductible, within policy limits."><InputShell prefix="$"><input id="deductible-loss" type="number" min="0" max="10000000" step="100" value={coveredLossAmount} onChange={(event) => setCoveredLossAmount(event.target.value)} /></InputShell></Field></div>
    {calculation.error && <InlineError message={calculation.error} />}
    {result && <div className="insurance-claim-results" aria-live="polite">
      <table><caption>Annual premium plus your share of the covered loss</caption><thead><tr><th scope="col">Scenario</th><th scope="col">Policy A</th><th scope="col">Policy B</th></tr></thead><tbody>
        <tr><th scope="row">No claim</th><td>{formatMoney(result.value.noClaimCostA)}</td><td>{formatMoney(result.value.noClaimCostB)}</td></tr>
        <tr><th scope="row">One covered claim</th><td>{formatMoney(result.value.oneClaimCostA)}</td><td>{formatMoney(result.value.oneClaimCostB)}</td></tr>
      </tbody></table>
      {/*
        The one-claim winner and the cheaper premium are often opposite policies,
        so each sentence has to name the policy it is about. Saying only "it takes
        3.33 claim-free years" after "Policy A costs less" reads as a fact about
        Policy A when it is the trade-off you accept by choosing Policy B.
      */}
      <p className="insurance-comparison-verdict">{result.value.oneClaimWinner === 'tie' ? 'Both policies cost the same in this one-claim scenario.' : `Policy ${result.value.oneClaimWinner.toUpperCase()} costs less in this one-claim scenario.`}{result.value.claimFreeYearsToRecover !== null && result.value.lowerPremiumOption !== null && ` Policy ${result.value.lowerPremiumOption.toUpperCase()} has the lower premium, saving ${formatMoney(result.value.annualPremiumSavings)} a year, and it takes ${formatNumber(result.value.claimFreeYearsToRecover, { maximumFractionDigits: 2 })} claim-free years for that saving to cover its ${formatMoney(result.value.additionalOutOfPocket)} of extra out-of-pocket cost on this loss.`}</p>
      <ResultDetails breakdown={result.breakdown} assumptions={result.assumptions} calculationVersion={result.calculationVersion} datasetSnapshotIds={result.datasetSnapshotIds} />
    </div>}
  </details>;
}
