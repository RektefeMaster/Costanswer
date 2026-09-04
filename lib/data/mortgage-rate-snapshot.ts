import currentMortgageRateJson from '@/data/freddie-mac/current.json';
import type { FreddieMacPmmsSnapshot } from './freddie-mac-pmms';
import { readVerifiedEnvelope } from './envelope';

const currentMortgageRateEnvelope = readVerifiedEnvelope<FreddieMacPmmsSnapshot>(currentMortgageRateJson);
export const mortgageRateSnapshot = currentMortgageRateEnvelope.snapshot;
export const mortgageRateManifest = currentMortgageRateEnvelope.manifest;
