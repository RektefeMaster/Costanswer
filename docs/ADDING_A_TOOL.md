# Adding a HowMuchUSA tool

The goal is to add an answer experience, not merely another route.

## 1. Prove the page should exist

Write down the user intent, distinct function/data, source/freshness needs, maintenance owner and closest existing engine. A new indexable route must score at least 75/100 under the quality gate in `docs/ARCHITECTURE.md`.

Do not proceed when the proposal is only a keyword or place-name variation.

## 2. Add or reuse a domain engine

Place calculation code in `lib/calculations/`. The engine must:

- validate unknown runtime input;
- be pure and deterministic for a fixed input/snapshot;
- return `calculationVersion`, `datasetSnapshotIds`, `breakdown` and `assumptions`;
- keep units explicit;
- show uncertainty as a range when the domain is not exact;
- have boundary, invariant and regression tests.

Never place a formula only inside a React component.

## 3. Add data through an adapter

For an external source, create a provider adapter in `lib/data/` and an ingestion script in `scripts/`. Request-time code reads only a promoted normalized snapshot.

Required gates are source schema, units, expected geography/series, uniqueness, completeness, finite values, domain invariants, previous-period diff and secret scrubbing. CI tests use a recorded response; they do not depend on provider uptime.

## 4. Register the tool

Add one entry to `lib/tool-registry.ts` with:

- stable ID and human URL;
- title, short title and honest description;
- category and engine ID;
- natural-language search aliases;
- typed related-tool edges;
- explicit quality score.

Hubs, search, related links and the sitemap derive from this registry.

## 5. Compose the page

Build a small client calculator island with `components/calculators/CalculatorUI.tsx`. Use `ToolPage` for the server-rendered title, context, methodology, sources, breadcrumbs, ad rail and related tools.

The first viewport should expose the core inputs and answer quickly. Do not insert an ad slot between the form and result.

## 6. Verify

Add regression tests, then run:

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Also verify that the page has a self-canonical URL, valid JSON-LD, crawlable inbound links, no indexable state/filter URLs, accessible labels, useful mobile stacking and a visible source date where data is used.

