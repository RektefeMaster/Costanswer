'use client';

import { useMemo, useState } from 'react';
import { calculateAutoLoan } from '@/lib/calculations/auto-loan';
import { calculationErrorMessage } from '@/lib/calculations/error';
import { CalculatorPanel, Field, InlineError, InputShell, PrimaryResult, ResultDetails, StatGrid } from './CalculatorUI';
import { money } from './finance-format';

export function AutoLoanCalculator() {
  const [mode, setMode] = useState<'purchase' | 'financed'>('financed');
  const [vehiclePrice, setVehiclePrice] = useState('28000');
  const [downPayment, setDownPayment] = useState('4000');
  const [tradeInValue, setTradeInValue] = useState('0');
  const [taxesAndFees, setTaxesAndFees] = useState('0');
  const [financedAmount, setFinancedAmount] = useState('24000');
  const [annualRatePercent, setAnnualRatePercent] = useState('6');
  const [termMonths, setTermMonths] = useState('60');
  const calculation = useMemo(() => {
    try {
      return {
        result: calculateAutoLoan({
          mode,
          vehiclePrice: Number(vehiclePrice),
          downPayment: Number(downPayment),
          tradeInValue: Number(tradeInValue),
          taxesAndFees: Number(taxesAndFees),
          financedAmount: Number(financedAmount),
          annualRatePercent: Number(annualRatePercent),
          termMonths: Number(termMonths),
        }),
        error: '',
      };
    } catch (error) {
      return { result: null, error: calculationErrorMessage(error) };
    }
  }, [mode, vehiclePrice, downPayment, tradeInValue, taxesAndFees, financedAmount, annualRatePercent, termMonths]);

  return (
    <CalculatorPanel title="Auto loan payment" intro="Monthly principal and interest for a vehicle loan. Not ownership cost." toolId="auto-loan" category="money" calculationState={calculation.result ? 'complete' : 'invalid'} calculationSignature={JSON.stringify([mode, vehiclePrice, downPayment, tradeInValue, taxesAndFees, financedAmount, annualRatePercent, termMonths])}>
      <div className="mode-tabs" role="group" aria-label="Loan input mode">
        <button type="button" aria-pressed={mode === 'financed'} className={mode === 'financed' ? 'active' : ''} onClick={() => setMode('financed')}>Amount financed</button>
        <button type="button" aria-pressed={mode === 'purchase'} className={mode === 'purchase' ? 'active' : ''} onClick={() => setMode('purchase')}>Price and down payment</button>
      </div>
      <div className="calc-form-grid">
        {mode === 'financed' ? (
          <Field label="Amount financed" htmlFor="auto-financed"><InputShell prefix="$"><input id="auto-financed" type="number" min="1" step="100" inputMode="decimal" value={financedAmount} onChange={(event) => setFinancedAmount(event.target.value)} /></InputShell></Field>
        ) : (
          <>
            <Field label="Vehicle price" htmlFor="auto-price"><InputShell prefix="$"><input id="auto-price" type="number" min="0" step="100" inputMode="decimal" value={vehiclePrice} onChange={(event) => setVehiclePrice(event.target.value)} /></InputShell></Field>
            <Field label="Down payment" htmlFor="auto-down"><InputShell prefix="$"><input id="auto-down" type="number" min="0" step="100" inputMode="decimal" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} /></InputShell></Field>
            <Field label="Trade-in" htmlFor="auto-trade"><InputShell prefix="$"><input id="auto-trade" type="number" min="0" step="100" inputMode="decimal" value={tradeInValue} onChange={(event) => setTradeInValue(event.target.value)} /></InputShell></Field>
            <Field label="Taxes and fees" htmlFor="auto-fees"><InputShell prefix="$"><input id="auto-fees" type="number" min="0" step="50" inputMode="decimal" value={taxesAndFees} onChange={(event) => setTaxesAndFees(event.target.value)} /></InputShell></Field>
          </>
        )}
        <Field label="Interest rate" htmlFor="auto-rate" hint="Nominal annual rate"><InputShell suffix="%"><input id="auto-rate" type="number" min="0" max="40" step="0.01" inputMode="decimal" value={annualRatePercent} onChange={(event) => setAnnualRatePercent(event.target.value)} /></InputShell></Field>
        <Field label="Term" htmlFor="auto-term"><InputShell suffix="months"><input id="auto-term" type="number" min="1" max="96" step="1" inputMode="numeric" value={termMonths} onChange={(event) => setTermMonths(event.target.value)} /></InputShell></Field>
      </div>
      {calculation.error && <InlineError message={calculation.error} />}
      {calculation.result && (
        <div className="calculation-output">
          <PrimaryResult label="Estimated monthly loan payment" value={money(calculation.result.value.monthlyPayment)} note={`${calculation.result.value.termMonths} months`} tone="mint" />
          <StatGrid items={[
            { label: 'Amount financed', value: money(calculation.result.value.amountFinanced) },
            { label: 'Total interest', value: money(calculation.result.value.totalInterest, 0) },
            { label: 'Total repayment', value: money(calculation.result.value.totalRepayment, 0) },
          ]} />
          <ResultDetails breakdown={calculation.result.breakdown} assumptions={calculation.result.assumptions} calculationVersion={calculation.result.calculationVersion} datasetSnapshotIds={calculation.result.datasetSnapshotIds} />
        </div>
      )}
    </CalculatorPanel>
  );
}
