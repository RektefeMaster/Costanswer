import { pinnedEngineId } from '@/lib/calculations/finance/version';

export const TAX_ENGINE_ID = pinnedEngineId('tax-v1.0.0');
export const SALARY_AFTER_TAX_ENGINE_ID = pinnedEngineId('salary-after-tax-v1.0.0');
export const PAYCHECK_ENGINE_ID = pinnedEngineId('paycheck-v1.0.0');
export const BONUS_TAX_ENGINE_ID = pinnedEngineId('bonus-tax-v1.0.0');
export const EFFECTIVE_TAX_RATE_ENGINE_ID = pinnedEngineId('effective-tax-rate-v1.0.0');
export const FEDERAL_BRACKET_ENGINE_ID = pinnedEngineId('federal-tax-bracket-v1.0.0');
export const DEFAULT_TAX_YEAR = 2026;
