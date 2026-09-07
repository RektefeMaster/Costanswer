/**
 * The gate every state row has to pass before it is called `supported`.
 *
 * Schema validation only proves a row is well-formed. These three checks prove
 * something harder: that the figures came from the state, that they are inside
 * the range a US state actually levies, and that the engine reproduces a number
 * the state itself published. A bracket threshold off by one digit passes the
 * schema and fails here, which is the entire point.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateTaxYearSnapshot } from '../lib/data/verify';
import { STATE_GOLDEN_VECTORS } from '../lib/data/tax/golden-vectors';
import { assertVectorCoverage, checkGoldenVector, verifyStatePolicy, type StateVerificationIssue } from '../lib/data/tax/verify-states';
import { calculateStateIncomeTax } from '../lib/calculations/tax/state';
import type { StateCode } from '../lib/location/states';

const snapshot = validateTaxYearSnapshot(JSON.parse(await readFile(path.join(process.cwd(), 'data', 'tax', '2026.json'), 'utf8')) as unknown);
if (snapshot.taxYear !== 2026) throw new Error('Expected the published tax snapshot to be tax year 2026.');

const issues: StateVerificationIssue[] = [];
for (const policy of snapshot.states) issues.push(...verifyStatePolicy(policy, snapshot.taxYear));

// A state with no schedule to get wrong needs no vectors, so the requirement
// falls only on the states that actually compute something.
const withSchedule = snapshot.states
  .filter((row) => row.status === 'supported' && row.kind !== 'none')
  .map((row) => row.stateCode as StateCode);
const withBrackets = snapshot.states
  .filter((row) => row.status === 'supported' && row.kind === 'progressive')
  .map((row) => row.stateCode as StateCode);
issues.push(...assertVectorCoverage(withSchedule, STATE_GOLDEN_VECTORS, withBrackets));

const failures: string[] = [];
for (const vector of STATE_GOLDEN_VECTORS) {
  const result = checkGoldenVector(vector, (input) => calculateStateIncomeTax({ taxYear: snapshot.taxYear, ...input }).tax);
  if (!result.passed) {
    failures.push(
      `${vector.stateCode} ${vector.filingStatus} at ${vector.taxableIncome}: expected ${vector.expectedTax.toFixed(2)}, `
      + `got ${result.actualTax.toFixed(2)} (off by ${result.differenceDollars.toFixed(2)}). Source: ${vector.sourceName}`,
    );
  }
}

const errors = issues.filter((issue) => issue.severity === 'error');
const warnings = issues.filter((issue) => issue.severity === 'warning');
for (const warning of warnings) console.warn(`  warning  ${warning.stateCode}: ${warning.message}`);
for (const error of errors) console.error(`  error    ${error.stateCode}: ${error.message}`);
for (const failure of failures) console.error(`  vector   ${failure}`);

if (errors.length > 0 || failures.length > 0) {
  throw new Error(`Tax snapshot failed verification: ${errors.length} policy errors, ${failures.length} golden vector failures.`);
}

const vectorStates = new Set(STATE_GOLDEN_VECTORS.map((vector) => vector.stateCode));
console.log(
  `Tax snapshot ${snapshot.snapshotId} passed validation: `
  + `${withSchedule.length} states with a schedule, ${STATE_GOLDEN_VECTORS.length} golden vectors across ${vectorStates.size} states, `
  + `${warnings.length} warnings.`,
);
