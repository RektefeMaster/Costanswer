import { z } from 'zod';
import { finiteNumber, formatMoney, formatNumber, round, type CalculationResult } from './contracts';
import { estimateAnnualTaxLiability } from './tax/annual';
import { FILING_STATUSES, FILING_STATUS_LABELS, type FilingStatus } from './tax/types';
import { getStateName, isStateCode } from '@/lib/location/states';
import {
  CAR_AFFORDABILITY_ENGINE_ID,
  VEHICLE_AFFORDABILITY_BANDS,
  composeVehicleOwnershipCost,
  composeVehiclePurchase,
  financeVehicle,
  maxVehiclePriceForBand,
  vehicleBurden,
  vehicleOperatingCost,
  type Powertrain,
  type VehicleAffordabilityVerdict,
  type VehicleEnergyPlan,
  type VehicleOperatingCost,
  type VehiclePurchase,
} from './vehicle';

export { CAR_AFFORDABILITY_ENGINE_ID };

/** A price that is used as the default for a field, never as a looked-up market value. */
export const EXAMPLE_MONTHLY_INSURANCE = 150;
export const EXAMPLE_MONTHLY_MAINTENANCE = 75;

const termMonthsSchema = finiteNumber('Loan term', 0, 120)
  .refine(Number.isInteger, 'Loan term must be a whole number of months.');

const incomeSchema = z.discriminatedUnion('incomeMode', [
  z.object({
    incomeMode: z.literal('take-home'),
    monthlyTakeHome: finiteNumber('Monthly take-home pay', 0, 10_000_000),
  }),
  z.object({
    incomeMode: z.literal('gross-salary'),
    annualGrossSalary: finiteNumber('Annual gross salary', 0, 100_000_000),
    filingStatus: z.enum(FILING_STATUSES),
    taxYear: z.number().int({ error: 'Tax year must be a whole number.' }),
  }),
]);

const powertrainSchema = z.discriminatedUnion('powertrain', [
  z.object({
    powertrain: z.literal('gas'),
    annualMiles: finiteNumber('Annual miles', 0, 250_000),
    mpg: finiteNumber('Miles per gallon', 1, 200),
    dollarsPerGallon: finiteNumber('Gas price', 0, 20),
  }),
  z.object({
    powertrain: z.literal('ev'),
    annualMiles: finiteNumber('Annual miles', 0, 250_000),
    kwhPer100Miles: finiteNumber('EV efficiency', 5, 100),
    electricityCentsPerKwh: finiteNumber('Electricity price', 0, 200),
    chargingLossPercent: finiteNumber('Charging loss', 0, 30),
  }),
]);

const sharedVehicleFields = {
  state: z.string().refine(isStateCode, 'Choose a U.S. state or D.C.'),
  income: incomeSchema,
  driving: powertrainSchema,
  downPayment: finiteNumber('Down payment', 0, 10_000_000),
  tradeInValue: finiteNumber('Trade-in value', 0, 10_000_000),
  salesTaxAndFees: finiteNumber('Taxes and fees', 0, 1_000_000),
  annualRatePercent: finiteNumber('Interest rate', 0, 40),
  termMonths: termMonthsSchema,
  monthlyInsurance: finiteNumber('Insurance', 0, 100_000),
  monthlyMaintenance: finiteNumber('Maintenance and repairs', 0, 100_000),
  annualRegistration: finiteNumber('Registration and yearly fees', 0, 100_000),
};

export const carAffordabilityInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('this-car'),
    vehiclePrice: finiteNumber('Vehicle price', 1, 10_000_000),
    ...sharedVehicleFields,
  }),
  z.object({
    mode: z.literal('how-much-car'),
    ...sharedVehicleFields,
  }),
]);

export type CarAffordabilityInput = z.infer<typeof carAffordabilityInputSchema>;
export type CarAffordabilityMode = CarAffordabilityInput['mode'];
export type CarIncomeMode = z.infer<typeof incomeSchema>['incomeMode'];
export type EnergyRateSource = 'official' | 'manual';

export type CarAffordabilityOptions = {
  energyRateSource: EnergyRateSource;
  energySnapshotId?: string;
};

export type CarAffordabilityValue = {
  mode: CarAffordabilityMode;
  powertrain: Powertrain;
  incomeMode: CarIncomeMode;
  monthlyTakeHome: number;
  stateTaxStatus: 'supported' | 'unsupported' | null;
  energyRateSource: EnergyRateSource;
  monthlyEnergyCost: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  monthlyRegistration: number;
  monthlyOperatingCost: number;
  verdict: VehicleAffordabilityVerdict | null;
  vehiclePrice: number | null;
  amountFinanced: number | null;
  upfrontCash: number | null;
  monthlyLoanPayment: number | null;
  monthlyTotal: number | null;
  annualTotal: number | null;
  totalShare: number | null;
  paymentShare: number | null;
  leftoverMonthly: number | null;
  costPerMile: number | null;
  totalInterest: number | null;
  totalOfPayments: number | null;
  comfortablePrice: number;
  reasonablePrice: number;
  aggressivePrice: number;
  priceGap: number | null;
};

type ResolvedIncome =
  | {
      incomeMode: 'take-home';
      monthlyTakeHome: number;
      stateTaxStatus: null;
      taxSnapshotId: null;
    }
  | {
      incomeMode: 'gross-salary';
      monthlyTakeHome: number;
      stateTaxStatus: 'supported' | 'unsupported';
      taxSnapshotId: string;
      taxYear: number;
      filingStatus: FilingStatus;
      annualGrossSalary: number;
    };

function resolveIncome(input: CarAffordabilityInput): ResolvedIncome {
  const income = input.income;
  switch (income.incomeMode) {
    case 'take-home':
      return {
        incomeMode: 'take-home',
        monthlyTakeHome: income.monthlyTakeHome,
        stateTaxStatus: null,
        taxSnapshotId: null,
      };
    case 'gross-salary': {
      const liability = estimateAnnualTaxLiability({
        annualGrossSalary: income.annualGrossSalary,
        state: input.state,
        filingStatus: income.filingStatus,
        taxYear: income.taxYear,
      });
      return {
        incomeMode: 'gross-salary',
        monthlyTakeHome: liability.takeHome / 12,
        stateTaxStatus: liability.stateTax.status,
        taxSnapshotId: liability.snapshotId,
        taxYear: liability.taxYear,
        filingStatus: liability.filingStatus,
        annualGrossSalary: liability.grossIncome,
      };
    }
    default: {
      const exhaustive: never = income;
      throw new Error(`Unhandled income mode: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function energyPlan(input: CarAffordabilityInput): VehicleEnergyPlan {
  const driving = input.driving;
  switch (driving.powertrain) {
    case 'gas':
      return {
        powertrain: 'gas',
        annualMiles: driving.annualMiles,
        mpg: driving.mpg,
        dollarsPerGallon: driving.dollarsPerGallon,
      };
    case 'ev':
      return {
        powertrain: 'ev',
        annualMiles: driving.annualMiles,
        kwhPer100Miles: driving.kwhPer100Miles,
        electricityCentsPerKwh: driving.electricityCentsPerKwh,
        chargingLossPercent: driving.chargingLossPercent,
      };
    default: {
      const exhaustive: never = driving;
      throw new Error(`Unhandled powertrain: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function energyLabel(powertrain: Powertrain): string {
  switch (powertrain) {
    case 'gas':
      return 'Fuel';
    case 'ev':
      return 'Charging';
    default: {
      const exhaustive: never = powertrain;
      throw new Error(`Unhandled powertrain: ${exhaustive}`);
    }
  }
}

function energyDetail(operating: VehicleOperatingCost, input: CarAffordabilityInput): string {
  const driving = input.driving;
  switch (driving.powertrain) {
    case 'gas':
      return `${formatNumber(operating.energy.gallonsPerYear ?? 0, { maximumFractionDigits: 1 })} gal per year at ${formatMoney(driving.dollarsPerGallon, 3)} ÷ 12`;
    case 'ev':
      return `${formatNumber(operating.energy.wallKwhPerYear ?? 0, { maximumFractionDigits: 0 })} kWh at the wall per year at ${driving.electricityCentsPerKwh.toFixed(2)}¢ ÷ 12`;
    default: {
      const exhaustive: never = driving;
      throw new Error(`Unhandled powertrain: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function cashAtSigningDetail(purchase: VehiclePurchase): string {
  const parts = ['Down payment.'];
  if (purchase.tradeInValue > 0) {
    parts.push(`The ${formatMoney(purchase.tradeInValue, 0)} trade-in is credited on top of it.`);
  }
  if (purchase.salesTaxAndFees > 0) {
    parts.push(purchase.financed
      ? `The ${formatMoney(purchase.salesTaxAndFees, 0)} in taxes and fees is part of the amount financed.`
      : `The ${formatMoney(purchase.salesTaxAndFees, 0)} in taxes and fees is covered by the same cash.`);
  }
  return parts.join(' ');
}

function sharePercent(share: number): string {
  return `${formatNumber(round(share * 100, 1), { maximumFractionDigits: 1 })}%`;
}

function energySnapshotIds(options: CarAffordabilityOptions): string[] {
  return options.energyRateSource === 'official' && options.energySnapshotId ? [options.energySnapshotId] : [];
}

function assumptions(
  input: CarAffordabilityInput,
  income: ResolvedIncome,
  options: CarAffordabilityOptions,
): string[] {
  const comfortable = VEHICLE_AFFORDABILITY_BANDS.comfortable;
  const reasonable = VEHICLE_AFFORDABILITY_BANDS.reasonable;
  const lines = [
    'This is a planning screen on take-home pay, not a lender approval, a quote, or advice to buy a particular car.',
    'The vehicle price is the number you type. This tool has no dealer, book-value, or market-price feed.',
    'This is cash out of pocket. Depreciation and resale value are not included, so it is not a full total-cost-of-ownership figure.',
    `Comfortable, Stretch and Risky are our own labels for bands on take-home pay: comfortable keeps the whole vehicle at or under ${comfortable.maxTotalShare * 100}% and the loan payment alone at or under ${comfortable.maxPaymentShare * 100}%, stretch still fits ${reasonable.maxTotalShare * 100}% and ${reasonable.maxPaymentShare * 100}%, and anything above that is the top of the range. They are planning thresholds, not a lender decision and not a rule that fits every household.`,
    'The rate is a nominal annual interest rate, not APR. There is no car-loan rate feed here, so the rate is whatever you type. Origination and prepaid finance charges are left out.',
    input.termMonths >= 1
      ? `Financing assumes ${input.termMonths} equal monthly payments with interest compounded monthly.`
      : 'No loan term was entered, so this only works as a cash purchase.',
    'Taxes and fees are a single amount you type. Registration is the yearly amount you type. State and county vehicle tax schedules are not modeled.',
    'Insurance and upkeep are only the numbers you enter. The starting values are placeholders, not quotes, and real premiums and repair bills vary widely by driver, vehicle, and coverage.',
  ];

  switch (input.driving.powertrain) {
    case 'gas':
      lines.push(
        options.energyRateSource === 'official'
          ? 'Fuel uses a published EIA regular-gasoline average for your state or region. That is not the price at a specific station.'
          : 'Fuel uses the pump price you typed. No official gasoline average is used in this result.',
        'Real MPG changes with speed, weather, terrain, and load.',
      );
      break;
    case 'ev':
      lines.push(
        options.energyRateSource === 'official'
          ? 'Charging uses a published EIA residential electricity average for your state. That is not your utility rate, and it is not public fast-charging pricing.'
          : 'Charging uses the electricity rate you typed. No official state average is used in this result.',
        'EV efficiency is battery energy. Charging loss is added to estimate what you pull from the wall. Public fast-charging fees and idle fees are not included.',
      );
      break;
    default: {
      const exhaustive: never = input.driving;
      throw new Error(`Unhandled powertrain: ${JSON.stringify(exhaustive)}`);
    }
  }

  switch (income.incomeMode) {
    case 'take-home':
      lines.push('Take-home pay is the monthly amount you entered. Nothing about your taxes is estimated here.');
      break;
    case 'gross-salary': {
      const stateName = getStateName(input.state);
      lines.push(
        `Take-home pay is estimated from a ${income.taxYear} salary with federal income tax, FICA, and state income tax, filing as ${FILING_STATUS_LABELS[income.filingStatus]}. It is an estimate, not employer withholding.`,
      );
      if (income.stateTaxStatus === 'unsupported') {
        lines.push(
          `${stateName} wage income tax is omitted because this release has no verified ${income.taxYear} schedule for it. Take-home pay is therefore overstated and the vehicle looks more affordable than it is.`,
        );
      }
      lines.push('Pre-tax payroll deductions, retirement contributions, health premiums, credits, and local income taxes are not included.');
      break;
    }
    default: {
      const exhaustive: never = income;
      throw new Error(`Unhandled income mode: ${JSON.stringify(exhaustive)}`);
    }
  }

  return lines;
}

export function calculateCarAffordability(
  rawInput: unknown,
  options: CarAffordabilityOptions = { energyRateSource: 'manual' },
): CalculationResult<CarAffordabilityValue> {
  const input = carAffordabilityInputSchema.parse(rawInput);
  const income = resolveIncome(input);
  const operating = vehicleOperatingCost({
    energy: energyPlan(input),
    monthlyInsurance: input.monthlyInsurance,
    monthlyMaintenance: input.monthlyMaintenance,
    annualRegistration: input.annualRegistration,
  });

  const budgetInput = {
    monthlyTakeHome: income.monthlyTakeHome,
    monthlyOperatingCost: operating.monthlyOperatingTotal,
    annualRatePercent: input.annualRatePercent,
    termMonths: input.termMonths,
    downPayment: input.downPayment,
    tradeInValue: input.tradeInValue,
    salesTaxAndFees: input.salesTaxAndFees,
  };
  const comfortable = maxVehiclePriceForBand({ ...budgetInput, band: 'comfortable' });
  const reasonable = maxVehiclePriceForBand({ ...budgetInput, band: 'reasonable' });
  const aggressive = maxVehiclePriceForBand({ ...budgetInput, band: 'aggressive' });

  const datasetSnapshotIds = [
    ...energySnapshotIds(options),
    ...(income.taxSnapshotId ? [income.taxSnapshotId] : []),
  ];
  const sharedValue = {
    powertrain: operating.energy.powertrain,
    incomeMode: income.incomeMode,
    monthlyTakeHome: round(income.monthlyTakeHome),
    stateTaxStatus: income.stateTaxStatus,
    energyRateSource: options.energyRateSource,
    monthlyEnergyCost: round(operating.energy.monthlyEnergyCost),
    monthlyInsurance: round(operating.monthlyInsurance),
    monthlyMaintenance: round(operating.monthlyMaintenance),
    monthlyRegistration: round(operating.monthlyRegistration),
    monthlyOperatingCost: round(operating.monthlyOperatingTotal),
    comfortablePrice: comfortable.maxVehiclePrice,
    reasonablePrice: reasonable.maxVehiclePrice,
    aggressivePrice: aggressive.maxVehiclePrice,
  };

  if (input.mode === 'how-much-car') {
    const value: CarAffordabilityValue = {
      mode: 'how-much-car',
      ...sharedValue,
      verdict: null,
      vehiclePrice: null,
      amountFinanced: null,
      upfrontCash: null,
      monthlyLoanPayment: null,
      monthlyTotal: null,
      annualTotal: null,
      totalShare: null,
      paymentShare: null,
      leftoverMonthly: null,
      costPerMile: null,
      totalInterest: null,
      totalOfPayments: null,
      priceGap: null,
    };
    return {
      value,
      calculationVersion: CAR_AFFORDABILITY_ENGINE_ID,
      datasetSnapshotIds,
      breakdown: [
        {
          label: 'Comfortable-range price',
          value: value.comfortablePrice > 0 ? formatMoney(value.comfortablePrice, 0) : 'None',
          detail: `Our guideline: whole vehicle at or under ${VEHICLE_AFFORDABILITY_BANDS.comfortable.maxTotalShare * 100}% of take-home, payment at or under ${VEHICLE_AFFORDABILITY_BANDS.comfortable.maxPaymentShare * 100}%`,
        },
        {
          label: 'Stretch-range price',
          value: value.reasonablePrice > 0 ? formatMoney(value.reasonablePrice, 0) : 'None',
          detail: `Up to ${VEHICLE_AFFORDABILITY_BANDS.reasonable.maxTotalShare * 100}% of take-home on the whole vehicle`,
        },
        {
          label: 'Top-of-range price',
          value: value.aggressivePrice > 0 ? formatMoney(value.aggressivePrice, 0) : 'None',
          detail: `Up to ${VEHICLE_AFFORDABILITY_BANDS.aggressive.maxTotalShare * 100}% of take-home. This is the top of our guideline range.`,
        },
        {
          label: 'Running cost before any payment',
          value: formatMoney(operating.monthlyOperatingTotal),
          detail: `${energyLabel(operating.energy.powertrain)}, insurance, upkeep, and registration each month`,
        },
      ],
      assumptions: assumptions(input, income, options),
    };
  }

  const financing = financeVehicle({
    purchase: composeVehiclePurchase({
      vehiclePrice: input.vehiclePrice,
      salesTaxAndFees: input.salesTaxAndFees,
      downPayment: input.downPayment,
      tradeInValue: input.tradeInValue,
    }),
    annualRatePercent: input.annualRatePercent,
    termMonths: input.termMonths,
  });
  const ownership = composeVehicleOwnershipCost({ financing, operating });
  const burden = vehicleBurden({
    monthlyTakeHome: income.monthlyTakeHome,
    monthlyTotal: ownership.monthlyTotal,
    monthlyLoanPayment: ownership.monthlyLoanPayment,
  });

  const value: CarAffordabilityValue = {
    mode: 'this-car',
    ...sharedValue,
    verdict: burden.verdict,
    vehiclePrice: round(input.vehiclePrice, 0),
    amountFinanced: round(financing.purchase.amountFinanced),
    upfrontCash: round(financing.purchase.upfrontCash),
    monthlyLoanPayment: round(ownership.monthlyLoanPayment),
    monthlyTotal: round(ownership.monthlyTotal),
    annualTotal: round(ownership.annualTotal),
    totalShare: burden.totalShare,
    paymentShare: burden.paymentShare,
    leftoverMonthly: round(burden.leftoverMonthly),
    costPerMile: round(ownership.costPerMile, 3),
    totalInterest: round(financing.totalInterest),
    totalOfPayments: round(financing.totalOfPayments),
    priceGap: comfortable.maxVehiclePrice > 0 ? round(input.vehiclePrice - comfortable.maxVehiclePrice, 0) : null,
  };

  return {
    value,
    calculationVersion: CAR_AFFORDABILITY_ENGINE_ID,
    datasetSnapshotIds,
    breakdown: [
      {
        label: 'Monthly loan payment',
        value: formatMoney(ownership.monthlyLoanPayment),
        detail: financing.purchase.financed
          ? `${formatMoney(financing.purchase.amountFinanced)} financed over ${input.termMonths} months at ${formatNumber(input.annualRatePercent, { maximumFractionDigits: 3 })}%`
          : 'Cash purchase. Nothing is financed.',
      },
      {
        label: `${energyLabel(operating.energy.powertrain)} each month`,
        value: formatMoney(operating.energy.monthlyEnergyCost),
        detail: energyDetail(operating, input),
      },
      {
        label: 'Insurance, upkeep, registration',
        value: formatMoney(operating.monthlyInsurance + operating.monthlyMaintenance + operating.monthlyRegistration),
        detail: `${formatMoney(operating.monthlyInsurance)} insurance + ${formatMoney(operating.monthlyMaintenance)} upkeep + ${formatMoney(operating.monthlyRegistration)} registration`,
      },
      {
        label: 'Total monthly vehicle cost',
        value: formatMoney(ownership.monthlyTotal),
        detail: `${formatMoney(ownership.annualTotal, 0)} a year. Depreciation is not included.`,
      },
      {
        label: 'Share of take-home pay',
        value: sharePercent(burden.totalShare),
        detail: `${formatMoney(income.monthlyTakeHome)} take-home per month · loan payment alone is ${sharePercent(burden.paymentShare)}`,
      },
      {
        label: 'Cash at signing',
        value: formatMoney(financing.purchase.upfrontCash),
        detail: cashAtSigningDetail(financing.purchase),
      },
    ],
    assumptions: assumptions(input, income, options),
  };
}
