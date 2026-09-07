/**
 * Salary URLs that are constants, not lookups.
 *
 * `salary-pages.ts` builds most paths, but it reads the OEWS snapshot at import
 * time to resolve occupation slugs. A client component that only needs a fixed
 * href should not pull a wage table in to get one, so the constants live here.
 */
export const SALARY_ROOT = '/salary' as const;
export const SALARY_STATE_INDEX_PATH = '/salary/states' as const;
