/**
 * The large data snapshots, declared rather than inferred.
 *
 * `resolveJsonModule` makes TypeScript read every imported JSON file and infer
 * a literal type for it. For these four that means inferring the structure of
 * 5.7 MB of packed wage and premium columns on every compile — and every one of
 * them is immediately `as unknown as`-cast to a schema-derived type, so the
 * inferred literal is discarded the moment it exists.
 *
 * Declaring them `unknown` costs nothing in safety, because the runtime shape
 * is proved elsewhere: the ingest validates against a Zod schema, the manifest
 * carries a hash, and `verify` rebuilds and compares it. It removes about nine
 * minutes from a typecheck, which is the difference between a release gate
 * somebody runs and one they skip.
 */
declare module '@/data/bls-oews/wages.json' {
  const value: unknown;
  export default value;
}

declare module '@/data/bls-oews/index.json' {
  const value: unknown;
  export default value;
}

declare module '@/data/cms-marketplace/premiums.json' {
  const value: unknown;
  export default value;
}

declare module '@/data/cms-marketplace/index.json' {
  const value: unknown;
  export default value;
}
