/**
 * Optional Worker binding. Node tests never load this module; `readStoreJson`
 * imports it only inside a try/catch so the same source runs in vitest.
 */
declare module 'cloudflare:workers' {
  export const env: {
    ASSETS?: {
      fetch: (input: Request) => Promise<Response>;
    };
  };
}
