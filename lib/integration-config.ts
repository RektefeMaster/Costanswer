import { z } from 'zod';
import { parsePublishingDate } from './publishing';

export type IntegrationEnvironment = Record<string, string | undefined>;

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseIntegrationConfig(environment: IntegrationEnvironment) {
  const privacyEffectiveDate = parseOptionalDate(environment.NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE);
  const publicContactEmail = parseOptionalEmail(environment.NEXT_PUBLIC_CONTACT_EMAIL);
  const policyVersion = blankToUndefined(environment.NEXT_PUBLIC_PRIVACY_POLICY_VERSION);

  const config = {
    analyticsEnabled: environment.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
    advertisingEnabled: environment.NEXT_PUBLIC_ADVERTISING_ENABLED === 'true',
    privacyEffectiveDate,
    publicContactEmail,
    policyVersion,
  };

  if (config.analyticsEnabled || config.advertisingEnabled) {
    const missing = [
      !config.privacyEffectiveDate && 'NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE',
      !config.publicContactEmail && 'NEXT_PUBLIC_CONTACT_EMAIL',
      !config.policyVersion && 'NEXT_PUBLIC_PRIVACY_POLICY_VERSION',
    ].filter(Boolean);
    if (missing.length) {
      throw new Error(`Optional analytics/advertising cannot be enabled without: ${missing.join(', ')}.`);
    }
  }
  return config;
}

function parseOptionalDate(value: string | undefined): string | undefined {
  const date = blankToUndefined(value);
  if (!date) return undefined;
  if (parsePublishingDate(date) === null) {
    throw new Error('NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE must be a real calendar date in YYYY-MM-DD format.');
  }
  return date;
}

function parseOptionalEmail(value: string | undefined): string | undefined {
  const email = blankToUndefined(value);
  if (!email) return undefined;
  return z.string().email().parse(email);
}

export const integrationConfig = parseIntegrationConfig(process.env);
