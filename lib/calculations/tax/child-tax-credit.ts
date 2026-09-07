import { z } from 'zod';
import { finiteNumber, formatMoney, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './types';
import { CHILD_TAX_CREDIT_ENGINE_ID } from './version';

export const childTaxCreditInputSchema = z.object({
  modifiedAgi: finiteNumber('Modified adjusted gross income', 0, 100_000_000),
  qualifyingChildren: z.number().int({ error: 'Qualifying children must be a whole number.' }).min(0).max(20),
  otherDependents: z.number().int({ error: 'Other dependents must be a whole number.' }).min(0).max(20).default(0),
  earnedIncome: finiteNumber('Earned income', 0, 100_000_000),
  /** Form 1040 tax before this credit (Credit Limit Worksheet A / line 18). */
  taxBeforeThisCredit: finiteNumber('Tax before this credit', 0, 100_000_000),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
});

export type ChildTaxCreditInput = z.infer<typeof childTaxCreditInputSchema>;

export type ChildTaxCreditValue = {
  taxYear: number;
  filingStatus: FilingStatus;
  modifiedAgi: number;
  qualifyingChildren: number;
  otherDependents: number;
  creditBeforePhaseOut: number;
  phaseOutReduction: number;
  creditAfterPhaseOut: number;
  nonrefundableCredit: number;
  additionalChildTaxCredit: number;
  totalCredit: number;
};

function roundUpTo(value: number, multiple: number): number {
  if (value <= 0) return 0;
  return Math.ceil(value / multiple) * multiple;
}

/**
 * Child tax credit, credit for other dependents, and additional child tax
 * credit from Rev. Proc. 2025-32 §4.05 and the 2026 Schedule 8812 draft.
 *
 * Part II-B (three or more children / Puerto Rico / withheld Social Security)
 * is not modelled, so the refundable amount can be too low for those filers.
 */
export function calculateChildTaxCredit(rawInput: unknown): CalculationResult<ChildTaxCreditValue> {
  const input = childTaxCreditInputSchema.parse(rawInput);
  const snapshot = getTaxYearSnapshot(input.taxYear);
  const ctc = snapshot.federalCredits.childTaxCredit;
  const threshold = input.filingStatus === 'marriedFilingJointly'
    ? ctc.phaseOutThresholdMarriedFilingJointly
    : ctc.phaseOutThresholdOtherStatuses;
  const creditBeforePhaseOut = input.qualifyingChildren * ctc.maxPerQualifyingChild
    + input.otherDependents * ctc.otherDependentCredit;
  const excess = roundUpTo(input.modifiedAgi - threshold, ctc.phaseOutRoundUpTo);
  const phaseOutReduction = excess * ctc.phaseOutRate;
  const creditAfterPhaseOut = Math.max(0, creditBeforePhaseOut - phaseOutReduction);
  const nonrefundableCredit = Math.min(creditAfterPhaseOut, input.taxBeforeThisCredit);
  const unused = creditAfterPhaseOut - nonrefundableCredit;
  const earnedIncomeExcess = Math.max(0, input.earnedIncome - ctc.additionalChildTaxCreditEarnedIncomeFloor);
  const additionalChildTaxCredit = input.qualifyingChildren === 0
    ? 0
    : Math.min(
      unused,
      input.qualifyingChildren * ctc.refundablePerQualifyingChild,
      earnedIncomeExcess * ctc.additionalChildTaxCreditEarnedIncomeRate,
    );

  const value: ChildTaxCreditValue = {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    modifiedAgi: round(input.modifiedAgi),
    qualifyingChildren: input.qualifyingChildren,
    otherDependents: input.otherDependents,
    creditBeforePhaseOut: round(creditBeforePhaseOut),
    phaseOutReduction: round(phaseOutReduction),
    creditAfterPhaseOut: round(creditAfterPhaseOut),
    nonrefundableCredit: round(nonrefundableCredit),
    additionalChildTaxCredit: round(additionalChildTaxCredit),
    totalCredit: round(nonrefundableCredit + additionalChildTaxCredit),
  };

  return {
    value,
    calculationVersion: CHILD_TAX_CREDIT_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      {
        label: `${input.qualifyingChildren} qualifying ${input.qualifyingChildren === 1 ? 'child' : 'children'} × ${formatMoney(ctc.maxPerQualifyingChild)}`,
        value: formatMoney(input.qualifyingChildren * ctc.maxPerQualifyingChild),
      },
      ...(input.otherDependents > 0
        ? [{
          label: `${input.otherDependents} other ${input.otherDependents === 1 ? 'dependent' : 'dependents'} × ${formatMoney(ctc.otherDependentCredit)}`,
          value: formatMoney(input.otherDependents * ctc.otherDependentCredit),
        }]
        : []),
      ...(phaseOutReduction > 0
        ? [{
          label: 'MAGI phase-out',
          value: `−${formatMoney(phaseOutReduction)}`,
          detail: `${formatMoney(excess)} over ${formatMoney(threshold)} for ${FILING_STATUS_LABELS[input.filingStatus]} × ${ctc.phaseOutRate * 100}%`,
        }]
        : []),
      {
        label: 'Nonrefundable credit',
        value: formatMoney(nonrefundableCredit),
        detail: `Limited by ${formatMoney(input.taxBeforeThisCredit)} of tax before this credit`,
      },
      {
        label: 'Additional child tax credit',
        value: formatMoney(additionalChildTaxCredit),
        detail: input.qualifyingChildren === 0
          ? 'The credit for other dependents is not refundable'
          : `Capped at ${formatMoney(ctc.refundablePerQualifyingChild)} per child and 15% of earned income over ${formatMoney(ctc.additionalChildTaxCreditEarnedIncomeFloor)}`,
      },
    ],
    assumptions: [
      `Tax year ${input.taxYear}. The ${formatMoney(ctc.maxPerQualifyingChild)} maximum and ${formatMoney(ctc.refundablePerQualifyingChild)} refundable cap are from ${snapshot.federalCredits.sourceName} §4.05.`,
      `The MAGI phase-out, ${formatMoney(ctc.otherDependentCredit)} credit for other dependents, and additional child tax credit earned-income worksheet are from the 2026 Schedule 8812 draft. That form is marked DRAFT—NOT FOR FILING.`,
      'A qualifying child for this credit is under 17 with a Social Security number. This page takes the count you enter as given and does not test the other Schedule 8812 rules.',
      'Modified AGI is treated as the figure you enter. Puerto Rico exclusions, Form 2555, and Form 4563 additions are not applied; if those apply, MAGI is higher and this credit is overstated.',
      'Form 2555 filers cannot take the additional child tax credit. That bar is not applied here.',
      'For three or more qualifying children, Part II-B of Schedule 8812 can raise the additional child tax credit using withheld Social Security and Medicare. That worksheet is not modelled, so the refundable amount can be too low for those filers.',
      'This is not a filed return and not tax advice.',
    ],
  };
}
