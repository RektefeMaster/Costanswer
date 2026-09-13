# Adding a CostAnswer tool

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

Then add a row to `data/source-registry.json` and to `lib/data/data-sources.ts`
with the same tier. See [`docs/DATA_SOURCE_REGISTRY.md`](DATA_SOURCE_REGISTRY.md)
for what a tier means and how the two files are asserted to agree.

## 4. Register the tool

Add one file under `lib/tools/registry/` named for the tool id, exporting
`tool`. Then run `npm run tools:index` so the generated barrel lists it.
Do not append to `lib/tool-registry.ts` — that file re-exports the catalogue
and is not where definitions live.

The entry needs:

- stable ID and human URL;
- title, short title and honest description;
- category and engine ID;
- natural-language search aliases;
- typed related-tool edges;
- explicit quality score;
- a **data manifest**, built with one of the four constructors in
  `lib/tools/data-manifest.ts`.

The manifest is the decision about what happens when a source is missing or out
of date, and there are only four honest answers:

| Constructor | Use it when | Fallback |
| --- | --- | --- |
| `requiresOfficialData` | The answer does not exist without the source. Tax tables, per-diem ceilings, filed plan premiums. | The page says the answer is unavailable |
| `formulaWithDefault` | Arithmetic that seeds one field from official data. A mortgage rate, an electricity rate. | The reader types the figure |
| `formulaWithBenchmark` | Arithmetic that prints official data beside the answer as context. | The context line is dropped |
| `formulaOnly` | Solvable from its inputs alone. Most of the catalogue. | Nothing to lose |

Reach for `formulaOnly` first and justify anything stronger. A tool that
declares `requiresData: true` may not present a complete result when a required
source is missing or stale, so declaring it lightly takes a working page off the
site the next time a government website moves a file.

If the page prints a dollar figure that no publisher supplies — a PMI rate, a
closing-cost allowance, an affordability band — declare it in `modeled` too. It
becomes a `MODELED` line on the receipt with the reason next to it, which is the
difference between a placeholder a reader knows to replace and a number they
plan around.

`assertToolDataManifest` runs over the whole catalogue at import and rejects a
manifest that contradicts itself: `requiresData` that does not match the
required list, a graceful fallback on a tool that requires data, a staleness
limit tighter than the provider's own release cycle, or `resultNature: 'exact'`
on a tool that cannot answer without an outside table. The receipt on the page —
`VERIFIED` / `OBSERVED` / `MODELED` / `USER ENTERED` — is generated from the
manifest, so a tool cannot claim a source it does not read.

Hubs, search, related links and the sitemap derive from this registry.

Add one `ToolEditorial` record in `lib/tool-content/` (the category file that matches, then `index.ts` coverage). The registry assert fails if a tool has no unique guide, FAQ, glossary, tips, and caveats. Copy must be written for that tool. Search aliases and optional `metaTitle` / `metaDescription` must describe what the engine actually does — no loan-program or location bait the page cannot compute. Optional `longTail` notes belong in that record, not as generated doorway URLs.

Add an explicit row in `lib/monetization/policy.ts`. A calculator with no
entry silently inherits `DEFAULT_POLICY` (`__default__`, general/low). Tax
and money tools belong with the other `financial` / `high` entries; health
estimates are `restricted`. The suite fails if a shipped tool has no policy
of its own.

## 5. Compose the page

Build a small client calculator island with `components/calculators/CalculatorUI.tsx`. Use `ToolPage` for the server-rendered title, editorial guide, compact engine notes, sources, breadcrumbs, ad rail and related tools.

The first viewport should expose the H1, then the core inputs and answer. Do not insert an ad slot between the form and result. Empty IAB reservations stay visually quiet.

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

