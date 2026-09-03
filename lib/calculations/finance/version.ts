/** New tools pin registry `engine` and runtime `calculationVersion` to the same string. */
export function pinnedEngineId<const Id extends `${string}-v${number}.${number}.${number}`>(id: Id): Id {
  return id;
}

export const LOAN_ENGINE_ID = pinnedEngineId('loan-v1.0.0');
export const COMPOUND_INTEREST_ENGINE_ID = pinnedEngineId('compound-interest-v1.0.0');
export const DEBT_PAYOFF_ENGINE_ID = pinnedEngineId('debt-payoff-v1.0.0');
