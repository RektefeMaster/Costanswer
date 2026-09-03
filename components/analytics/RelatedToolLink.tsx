'use client';

import type { ReactNode } from 'react';
import { emitAnalyticsEvent } from '@/lib/analytics';
import type { CategoryId } from '@/lib/tool-registry';

export function RelatedToolLink({
  href,
  toolId,
  category,
  relatedToolId,
  children,
}: {
  href: string;
  toolId: string;
  category: CategoryId;
  relatedToolId: string;
  children: ReactNode;
}) {
  return (
    <a href={href} onClick={() => emitAnalyticsEvent('related_tool_click', { toolId, category, relatedToolId })}>
      {children}
    </a>
  );
}

