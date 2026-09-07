'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/monetization/attribution/capture';

/**
 * Runs the one-time attribution capture for a tab.
 *
 * Mounted once in the layout rather than per page, so the landing page recorded
 * is the page the visit actually started on. Renders nothing and never blocks:
 * if storage is unavailable it simply records nothing and the product is
 * unaffected.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
