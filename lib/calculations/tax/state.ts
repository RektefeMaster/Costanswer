import type { StateTaxPolicy } from '@/lib/data/tax/schema';
import { getTaxYearSnapshot } from '@/lib/data/tax/snapshot';
import { calculateProgressiveTax } from './brackets';
import type { FilingStatus, StateIncomeTaxBreakdown, OmittedLocalTax } from './types';
import type { StateCode } from '@/lib/location/states';

function policyFor(taxYear: number, state: StateCode): StateTaxPolicy {
  const snapshot = getTaxYearSnapshot(taxYear);
  const policy = snapshot.states.find((row) => row.stateCode === state);
  if (!policy) throw new Error(`No tax policy row for ${state} in tax year ${taxYear}.`);
  return policy;
}

export type StateTaxInput = {
  taxYear: number;
  state: StateCode;
  filingStatus: FilingStatus;
  taxableIncome: number;
  /**
   * Federal income tax for the same year.
   *
   * Required only by the states that let it be deducted from state taxable
   * income. Those states are the reason this is an input at all: their state
   * tax genuinely depends on the federal figure, so the engine cannot compute
   * them from income alone and must not pretend to.
   */
  federalIncomeTax?: number;
  /** Dependents claimed, for states whose exemption is a per-dependent credit. */
  dependents?: number;
  /**
   * The federal standard deduction for this year and filing status.
   *
   * Required by states that tax federal taxable income rather than gross
   * wages. Passing the live figure rather than copying it into each state row
   * is what stops those rows going stale the year it changes.
   */
  federalStandardDeduction?: number;
};

type SupportedPolicy = Extract<StateTaxPolicy, { status: 'supported' }>;

/**
 * What a state charges on wage income.
 *
 * The shapes below are not stylistic variations on one formula; they are
 * genuinely different arithmetic, and collapsing them loses real money:
 *
 *  - a deduction is worth the marginal rate, a credit is worth its face value
 *  - a percentage-of-income deduction with a floor and a cap is not its cap
 *  - a state that deducts federal tax depends on a number computed elsewhere
 *
 * Anything the model cannot compute is reported rather than approximated. A
 * local tax it cannot know is named as an omission; a state with no verified
 * schedule returns `unsupported` and the page says federal and FICA only.
 */
function computeSupportedStateTax(
  policy: SupportedPolicy,
  input: StateTaxInput,
): { tax: number; taxBeforeCredits: number; exemptionCredit: number; federalTaxDeducted: number } {
  const { filingStatus } = input;
  const none = { tax: 0, taxBeforeCredits: 0, exemptionCredit: 0, federalTaxDeducted: 0 };
  if (policy.kind === 'none') return none;

  const federalTaxDeducted = federalDeductionFor(policy, input);
  const income = Math.max(
    0,
    startingIncomeFor(policy, input) - federalTaxDeducted,
  );

  let taxBeforeCredits: number;
  switch (policy.kind) {
    case 'flat': {
      const deduction = policy.standardDeductionByFilingStatus?.[filingStatus] ?? 0;
      const exemption = policy.exemptionByFilingStatus[filingStatus];
      taxBeforeCredits = Math.max(0, income - deduction - exemption) * policy.rate;
      break;
    }
    case 'flatWithSurtax': {
      taxBeforeCredits = income * policy.rate
        + Math.max(0, income - policy.surtaxThreshold) * policy.surtaxRate;
      break;
    }
    case 'progressive': {
      /*
       * A qualifying low income filer is not on this schedule at all, so the
       * deduction, the exemptions and the credit below never come into it. The
       * alternative table already has all of that built into its figures.
       */
      const alternative = policy.alternativeLowIncomeSchedule;
      if (alternative) {
        const ceiling = alternative.appliesAtOrBelowByFilingStatus[filingStatus];
        if (ceiling > 0 && income <= ceiling) {
          return {
            tax: calculateProgressiveTax(income, alternative.bracketsByFilingStatus[filingStatus]),
            taxBeforeCredits: calculateProgressiveTax(income, alternative.bracketsByFilingStatus[filingStatus]),
            exemptionCredit: 0,
            federalTaxDeducted,
          };
        }
      }

      const fullDeduction = policy.percentageStandardDeduction
        ? boundedPercentageDeduction(policy.percentageStandardDeduction, income, filingStatus)
        : policy.standardDeductionByFilingStatus[filingStatus];
      const deduction = afterPhaseOut(fullDeduction, policy.standardDeductionPhaseOut, income, filingStatus);
      const stepped = policy.steppedPersonalExemption;
      const exemptions = stepped
        ? steppedExemptionAt(stepped, income, filingStatus, input.dependents ?? 0)
        : afterPhaseOut(
          policy.personalExemptionByFilingStatus?.[filingStatus] ?? 0,
          policy.personalExemptionPhaseOut,
          income,
          filingStatus,
        ) + (policy.perDependentExemption ?? 0) * (input.dependents ?? 0);
      const taxableIncome = Math.max(0, income - deduction - exemptions);
      taxBeforeCredits = calculateProgressiveTax(taxableIncome, policy.bracketsByFilingStatus[filingStatus])
        + (policy.additionalTax
          ? Math.max(0, taxableIncome - policy.additionalTax.thresholdByFilingStatus[filingStatus]) * policy.additionalTax.rate
          : 0);
      break;
    }
    default: {
      const exhaustive: never = policy;
      throw new Error(`Unhandled state tax kind: ${JSON.stringify(exhaustive)}`);
    }
  }

  const exemptionCredit = exemptionCreditFor(policy, input, taxBeforeCredits);
  return {
    // A non-refundable credit cannot take the liability below zero. Letting it
    // would turn an exemption into a payment the state does not make.
    tax: Math.max(0, taxBeforeCredits - exemptionCredit),
    taxBeforeCredits,
    exemptionCredit,
    federalTaxDeducted,
  };
}

/**
 * What is left of a deduction or exemption once income has eaten into it.
 *
 * The reduction is the fraction of the phase-out band the filer has crossed, so
 * it is gradual rather than a cliff — someone $1 over the start keeps almost
 * all of it. Clamping the fraction at 1 is what stops a very high income from
 * turning the deduction negative and adding tax that no state charges.
 */
type ProportionalPhaseOut = {
  startIncomeByFilingStatus: Record<FilingStatus, number>;
  rangeByFilingStatus: Record<FilingStatus, number>;
  roundReductionDownToMultipleOf?: number;
};

function afterPhaseOut(
  amount: number,
  spec: ProportionalPhaseOut | undefined,
  income: number,
  filingStatus: FilingStatus,
): number {
  if (!spec || amount === 0) return amount;
  const range = spec.rangeByFilingStatus[filingStatus];
  if (range <= 0) return amount;
  const over = income - spec.startIncomeByFilingStatus[filingStatus];
  if (over <= 0) return amount;

  let reduction = amount * Math.min(1, over / range);
  const step = spec.roundReductionDownToMultipleOf;
  if (step !== undefined) reduction = Math.floor(reduction / step) * step;
  return Math.max(0, amount - reduction);
}

/**
 * A stepped exemption: look the per-person amount up by income, then count heads.
 *
 * The step boundaries are inclusive at the top, matching how the states write
 * them — Ohio's "$40,000 or less" band really does include $40,000 exactly.
 */
function steppedExemptionAt(
  spec: {
    amountSteps: ReadonlyArray<{ notOver: number | null; amount: number }>;
    countByFilingStatus: Record<FilingStatus, number>;
  },
  income: number,
  filingStatus: FilingStatus,
  dependents: number,
): number {
  const step = spec.amountSteps.find((candidate) => candidate.notOver === null || income <= candidate.notOver);
  if (!step) throw new Error('Stepped exemption has no open top step, so high incomes fall through it.');
  return step.amount * (spec.countByFilingStatus[filingStatus] + dependents);
}

function boundedPercentageDeduction(
  spec: NonNullable<Extract<SupportedPolicy, { kind: 'progressive' }>['percentageStandardDeduction']>,
  income: number,
  filingStatus: FilingStatus,
): number {
  const raw = income * spec.rate;
  return Math.min(
    Math.max(raw, spec.minimumByFilingStatus[filingStatus]),
    spec.maximumByFilingStatus[filingStatus],
  );
}

/**
 * Where this state starts counting.
 *
 * A state that taxes federal taxable income has already had the federal
 * standard deduction taken out of its base. Handing it gross wages instead
 * taxes that deduction a second time and overstates the bill by the rate times
 * roughly sixteen thousand dollars — a figure large enough to be obvious on a
 * paycheck and small enough to look plausible on a page.
 */
function startingIncomeFor(policy: SupportedPolicy, input: StateTaxInput): number {
  const basis = 'taxableIncomeBasis' in policy ? policy.taxableIncomeBasis : undefined;
  if (basis !== 'federal-taxable-income') return input.taxableIncome;

  if (input.federalStandardDeduction === undefined) {
    throw new Error(
      `${input.state} taxes federal taxable income, so federalStandardDeduction is required.`,
    );
  }
  return Math.max(0, input.taxableIncome - input.federalStandardDeduction);
}

function federalDeductionFor(policy: SupportedPolicy, input: StateTaxInput): number {
  const spec = 'federalDeduction' in policy ? policy.federalDeduction : undefined;
  if (!spec) return 0;
  if (input.federalIncomeTax === undefined) {
    // Silently skipping it would understate tax in exactly the states that
    // allow it, and by a lot. Better to refuse than to be quietly wrong.
    throw new Error(
      `${input.state} deducts federal income tax from state taxable income, so federalIncomeTax is required.`,
    );
  }
  const cap = spec.capByFilingStatus?.[input.filingStatus];
  return cap === undefined || cap === null
    ? Math.max(0, input.federalIncomeTax)
    : Math.min(Math.max(0, input.federalIncomeTax), cap);
}

function exemptionCreditFor(policy: SupportedPolicy, input: StateTaxInput, taxBeforeCredits: number): number {
  const spec = 'exemptionCredit' in policy ? policy.exemptionCredit : undefined;
  if (!spec) return 0;

  let federalShare = 0;
  if (spec.rateOfFederalStandardDeduction !== undefined) {
    if (input.federalStandardDeduction === undefined) {
      throw new Error(
        `${input.state} bases its credit on the federal standard deduction, so federalStandardDeduction is required.`,
      );
    }
    federalShare = spec.rateOfFederalStandardDeduction * input.federalStandardDeduction;
  }

  const full = spec.perFilerByFilingStatus[input.filingStatus]
    + spec.perDependent * (input.dependents ?? 0)
    + federalShare;

  if (!spec.phaseOut) return Math.min(full, taxBeforeCredits);

  const over = Math.max(0, input.taxableIncome - spec.phaseOut.startIncomeByFilingStatus[input.filingStatus]);
  const reduced = Math.max(0, full - over * spec.phaseOut.ratePerDollar);
  return Math.min(reduced, taxBeforeCredits);
}

function omittedLocalTaxFor(policy: SupportedPolicy): OmittedLocalTax | undefined {
  const spec = 'localAddOn' in policy ? policy.localAddOn : undefined;
  if (!spec) return undefined;
  return {
    label: spec.label,
    basis: spec.basis,
    typicalRateRange: spec.typicalRateRange,
    appliesTo: spec.appliesTo,
  };
}

export function calculateStateIncomeTax(input: StateTaxInput): StateIncomeTaxBreakdown {
  if (!Number.isFinite(input.taxableIncome) || input.taxableIncome < 0) {
    throw new Error('Income must be a finite amount of at least $0.');
  }
  const policy = policyFor(input.taxYear, input.state);
  if (policy.status === 'unsupported') {
    return {
      taxYear: input.taxYear,
      state: input.state,
      filingStatus: input.filingStatus,
      status: 'unsupported',
      kind: 'omitted',
      provider: policy.provider,
      sourceUrl: policy.sourceUrl,
      scheduleTaxYear: input.taxYear,
      tax: 0,
      reason: policy.reason,
    };
  }

  const computed = computeSupportedStateTax(policy, input);
  const scheduleTaxYear = policy.kind === 'none' ? input.taxYear : policy.scheduleTaxYear;

  return {
    taxYear: input.taxYear,
    state: input.state,
    filingStatus: input.filingStatus,
    status: 'supported',
    kind: policy.kind,
    provider: policy.provider,
    sourceUrl: policy.sourceUrl,
    scheduleTaxYear,
    tax: computed.tax,
    // Only reported where they did something, so a page does not print a line
    // saying a credit of zero was applied.
    taxBeforeCredits: computed.exemptionCredit > 0 ? computed.taxBeforeCredits : undefined,
    exemptionCredit: computed.exemptionCredit > 0 ? computed.exemptionCredit : undefined,
    federalTaxDeducted: computed.federalTaxDeducted > 0 ? computed.federalTaxDeducted : undefined,
    omittedLocalTax: omittedLocalTaxFor(policy),
  };
}
