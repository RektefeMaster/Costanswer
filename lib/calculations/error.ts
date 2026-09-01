import { z } from 'zod';

export function calculationErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Check your inputs.';
  return error instanceof Error ? error.message : 'Check your inputs.';
}

