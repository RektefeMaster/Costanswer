/** New tools pin registry `engine` and runtime `calculationVersion` to the same string. */
export function pinnedEngineId<const Id extends `${string}-v${number}.${number}.${number}`>(id: Id): Id {
  return id;
}

export const LOAN_ENGINE_ID = pinnedEngineId('loan-v1.0.0');
export const COMPOUND_INTEREST_ENGINE_ID = pinnedEngineId('compound-interest-v1.0.0');
export const DEBT_PAYOFF_ENGINE_ID = pinnedEngineId('debt-payoff-v1.0.0');
export const CAR_LOAN_ENGINE_ID = pinnedEngineId('car-loan-v1.0.0');
export const INVESTMENT_ENGINE_ID = pinnedEngineId('investment-v1.0.0');
export const RETIREMENT_ENGINE_ID = pinnedEngineId('retirement-v1.0.0');
export const AMORTIZATION_ENGINE_ID = pinnedEngineId('amortization-v1.0.0');
export const CD_ENGINE_ID = pinnedEngineId('cd-v1.0.0');
export const INTEREST_ENGINE_ID = pinnedEngineId('interest-v1.0.0');
export const ROTH_IRA_ENGINE_ID = pinnedEngineId('roth-ira-v1.0.0');
export const K401_ENGINE_ID = pinnedEngineId('401k-v1.0.0');
export const MORTGAGE_PAYOFF_ENGINE_ID = pinnedEngineId('mortgage-payoff-v1.0.0');
export const REFINANCE_ENGINE_ID = pinnedEngineId('refinance-v1.0.0');
export const CREDIT_CARD_PAYOFF_ENGINE_ID = pinnedEngineId('credit-card-payoff-v1.0.0');
