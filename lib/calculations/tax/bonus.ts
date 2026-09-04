import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from '@/lib/calculations/contracts';
import { getStateName, isStateCode, type StateCode } from '@/lib/location/states';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateFica } from './fica';
import { calculateStateIncomeTax } from './state';
import { FILING_STATUSES, type FilingStatus } from './types';
import { BONUS_TAX_ENGINE_ID, DEFAULT_TAX_YEAR } from './version';

export const bonusTaxInputSchema = z.object({
  bonusAmount: finiteNumber('Bonus amount', 0, 100_000_000),
  /**
   * Supplemental wages already paid this calendar year.
   *
   * The mandatory rate applies to the part of the year's cumulative supplemental
   * wages above the threshold, so a second bonus can be withheld differently
   * from the first even when the amounts are identical.
   */
  priorSupplementalWagesThisYear: finiteNumber('Supplemental wages already paid this year', 0, 100_000_000),
  /** Regular wages so far, which decide how much Social Security room is left. */
  regularWagesToDate: finiteNumber('Regular wages paid so far this year', 0, 100_000_000),
  state: z.string().refine(isStateCode, 'Choose a U.S. state or D.C.'),
  filingStatus: z.enum(FILING_STATUSES),
  taxYear: z.number().int({ error: 'Tax year must be a whole number.' }).optional(),
});

export type BonusTaxInput = z.infer<typeof bonusTaxInputSchema>;

export type BonusTaxValue = {
  taxYear: number;
  bonusAmount: number;
  /** Bonus dollars withheld at the optional flat rate. */
  amountAtOptionalRate: number;
  /** Bonus dollars past the yearly threshold, withheld at the mandatory rate. */
  amountAtMandatoryRate: number;
  federalWithholding: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  stateWithholding: number;
  totalWithheld: number;
  takeHome: number;
  effectiveWithholdingRate: number;
  optionalFlatRate: number;
  mandatoryFlatRate: number;
  mandatoryRateThreshold: number;
  crossesMandatoryThreshold: boolean;
  socialSecurityCapped: boolean;
  state: StateCode;
  stateTaxStatus: 'supported' | 'unsupported';
  stateNote: string;
};

/**
 * What actually lands from a bonus, and why it looks over-taxed.
 *
 * A bonus paid separately from regular wages is withheld at a flat percentage
 * set by the IRS, not at the rate the recipient's salary implies. Someone in a
 * 12% bracket sees 22% taken and assumes bonuses are taxed harder; someone in
 * the 32% bracket sees 22% and under-withholds. Neither is a tax rate — the
 * year's real liability is settled on the return — and saying so is most of the
 * value of this calculation.
 */
export function calculateBonusTax(rawInput: unknown): CalculationResult<BonusTaxValue> {
  const input = bonusTaxInputSchema.parse(rawInput);
  const taxYear = input.taxYear ?? DEFAULT_TAX_YEAR;
  const snapshot = getTaxYearSnapshot(taxYear);
  const { supplemental } = snapshot;
  const state = input.state as StateCode;

  // Only the part of this bonus that pushes cumulative supplemental wages past
  // the threshold takes the mandatory rate.
  const roomBelowThreshold = Math.max(0, supplemental.mandatoryRateThreshold - input.priorSupplementalWagesThisYear);
  const amountAtOptionalRate = Math.min(input.bonusAmount, roomBelowThreshold);
  const amountAtMandatoryRate = input.bonusAmount - amountAtOptionalRate;
  const federalWithholding = amountAtOptionalRate * supplemental.optionalFlatRate
    + amountAtMandatoryRate * supplemental.mandatoryFlatRate;

  // FICA is not flat-rated: it continues from wages already paid this year, so
  // the Social Security cap and the additional Medicare threshold both depend
  // on what has been earned so far.
  const wagesBefore = input.regularWagesToDate + input.priorSupplementalWagesThisYear;
  const ficaBefore = calculateFica({ taxYear, filingStatus: input.filingStatus, grossIncome: wagesBefore, fica: snapshot.fica });
  const ficaAfter = calculateFica({
    taxYear,
    filingStatus: input.filingStatus,
    grossIncome: wagesBefore + input.bonusAmount,
    fica: snapshot.fica,
  });
  const socialSecurity = ficaAfter.socialSecurity - ficaBefore.socialSecurity;
  const medicare = ficaAfter.medicare - ficaBefore.medicare;
  const additionalMedicare = ficaAfter.additionalMedicare - ficaBefore.additionalMedicare;

  // State supplemental rules vary and are not published as one table, so the
  // state figure is the marginal effect of the bonus under the state's annual
  // schedule rather than a claimed state supplemental rate.
  const stateBefore = calculateStateIncomeTax({ taxYear, state, filingStatus: input.filingStatus, taxableIncome: wagesBefore });
  const stateAfter = calculateStateIncomeTax({
    taxYear,
    state,
    filingStatus: input.filingStatus,
    taxableIncome: wagesBefore + input.bonusAmount,
  });
  const stateSupported = stateAfter.status === 'supported';
  const stateWithholding = stateSupported ? Math.max(0, stateAfter.tax - stateBefore.tax) : 0;

  const totalWithheld = federalWithholding + socialSecurity + medicare + additionalMedicare + stateWithholding;
  const takeHome = input.bonusAmount - totalWithheld;
  const effectiveWithholdingRate = input.bonusAmount > 0 ? totalWithheld / input.bonusAmount : 0;

  const stateNote = stateSupported
    ? `${getStateName(state)} is estimated from its annual schedule as the extra tax this bonus adds, not from a state supplemental rate.`
    : `${getStateName(state)} state withholding is not modeled in this release. Federal and FICA are still estimated, so the total is low by whatever the state takes.`;

  return {
    value: {
      taxYear,
      bonusAmount: round(input.bonusAmount),
      amountAtOptionalRate: round(amountAtOptionalRate),
      amountAtMandatoryRate: round(amountAtMandatoryRate),
      federalWithholding: round(federalWithholding),
      socialSecurity: round(socialSecurity),
      medicare: round(medicare),
      additionalMedicare: round(additionalMedicare),
      stateWithholding: round(stateWithholding),
      totalWithheld: round(totalWithheld),
      takeHome: round(takeHome),
      effectiveWithholdingRate: round(effectiveWithholdingRate, 4),
      optionalFlatRate: supplemental.optionalFlatRate,
      mandatoryFlatRate: supplemental.mandatoryFlatRate,
      mandatoryRateThreshold: supplemental.mandatoryRateThreshold,
      crossesMandatoryThreshold: amountAtMandatoryRate > 0,
      socialSecurityCapped: ficaAfter.socialSecurity === ficaBefore.socialSecurity && input.bonusAmount > 0,
      state,
      stateTaxStatus: stateSupported ? 'supported' : 'unsupported',
      stateNote,
    },
    calculationVersion: BONUS_TAX_ENGINE_ID,
    datasetSnapshotIds: [snapshot.snapshotId],
    breakdown: [
      {
        label: `Federal withholding at ${formatNumber(supplemental.optionalFlatRate * 100, { maximumFractionDigits: 0 })}%`,
        value: formatMoney(amountAtOptionalRate * supplemental.optionalFlatRate),
        detail: `${formatMoney(amountAtOptionalRate, 0)} of the bonus, the flat supplemental rate`,
      },
      ...(amountAtMandatoryRate > 0 ? [{
        label: `Federal withholding at ${formatNumber(supplemental.mandatoryFlatRate * 100, { maximumFractionDigits: 0 })}%`,
        value: formatMoney(amountAtMandatoryRate * supplemental.mandatoryFlatRate),
        detail: `${formatMoney(amountAtMandatoryRate, 0)} above ${formatMoney(supplemental.mandatoryRateThreshold, 0)} of supplemental wages this year`,
      }] : []),
      {
        label: 'Social Security',
        value: formatMoney(socialSecurity),
        detail: socialSecurity === 0 && input.bonusAmount > 0
          ? `Already at the ${formatMoney(snapshot.fica.socialSecurityWageBase, 0)} wage base for the year`
          : `${formatNumber(snapshot.fica.socialSecurityRate * 100, { maximumFractionDigits: 2 })}% up to the ${formatMoney(snapshot.fica.socialSecurityWageBase, 0)} wage base`,
      },
      {
        label: 'Medicare',
        value: formatMoney(medicare + additionalMedicare),
        detail: additionalMedicare > 0
          ? `${formatNumber(snapshot.fica.medicareRate * 100, { maximumFractionDigits: 2 })}% plus the ${formatNumber(snapshot.fica.additionalMedicareRate * 100, { maximumFractionDigits: 2 })}% additional Medicare tax`
          : `${formatNumber(snapshot.fica.medicareRate * 100, { maximumFractionDigits: 2 })}% with no cap`,
      },
      {
        label: 'State',
        value: stateSupported ? formatMoney(stateWithholding) : 'Not modeled',
        detail: stateSupported ? `${getStateName(state)} annual schedule, marginal effect of the bonus` : `No verified ${taxYear} schedule for ${getStateName(state)}`,
      },
      {
        label: 'What lands',
        value: formatMoney(takeHome),
        detail: `${formatNumber(effectiveWithholdingRate * 100, { maximumFractionDigits: 1 })}% of the bonus withheld in total`,
      },
    ],
    assumptions: [
      'This is withholding, not tax. A flat percentage comes out at payout; what you actually owe on the bonus is settled with the rest of your income on your return, and the difference comes back as a refund or is owed.',
      `Federal withholding uses the IRS flat supplemental rate of ${formatNumber(supplemental.optionalFlatRate * 100, { maximumFractionDigits: 0 })}%, and ${formatNumber(supplemental.mandatoryFlatRate * 100, { maximumFractionDigits: 0 })}% on supplemental wages above ${formatMoney(supplemental.mandatoryRateThreshold, 0)} in a calendar year. Source: ${supplemental.sourceName}.`,
      'That assumes your employer pays the bonus separately and uses the flat-rate method. An employer may instead add the bonus to a regular paycheck and withhold from the IRS wage tables, which usually withholds a different amount.',
      'Social Security and Medicare are not flat-rated. They continue from the wages you have already been paid this year, which is why the Social Security cap and the additional Medicare threshold depend on the figures you enter.',
      ...(stateSupported ? [] : ['State withholding is not included, so the total shown is lower than what will actually come out.']),
      'Retirement deferrals, benefit premiums, garnishments, and local taxes are not modeled.',
      'This is an estimate of a paycheck, not tax advice.',
    ],
  };
}
