import currentGeographyJson from '@/data/geography/current.json';
import type { GeographySnapshot } from './geography';
import { readVerifiedEnvelope } from './envelope';

const envelope = readVerifiedEnvelope<GeographySnapshot>(currentGeographyJson);
export const geographySnapshot = envelope.snapshot;
export const geographyManifest = envelope.manifest;
