# NAIC insurance benchmarks

Maintainer: CostAnswer data maintainers. Verified available releases: September 5, 2026.

This snapshot uses observed **2023** annual premiums/expenditures. The report publication year must not be used as the price year. It is a historical budgeting benchmark, not a quote or a 2026 premium forecast.

## Sources and definitions

- [NAIC Homeowners Report](https://content.naic.org/sites/default/files/publication-hmr-zu-homeowners-report.pdf): live cover says “Data for 2023”, July 2026. Table 4 totals give HO-3 owner-occupied annual premiums; Table 5 totals give HO-4 renters annual premiums. National values are $1,737 and $173. Month precision is retained because no exact publication day is printed on the cover.
- [NAIC 2022/2023 Auto Insurance Database Report](https://content.naic.org/sites/default/files/publication-aut-pb-auto-insurance-database.pdf): [released February 13, 2026](https://content.naic.org/article/naic-releases-2022-2023-auto-insurance-database-report). Tables 1C, 2C, 3C, 4 and 5 supply 2023 liability, collision, comprehensive, expenditure and combined premiums. National expenditure is $1,281.92 and combined premium is $1,438.60. The earlier supplement has different values; do not replace full-report figures with supplement figures.
- [NAIC publications catalog](https://content.naic.org/publications) was checked for newer publicly downloadable editions. It lists the 2023 auto supplement and 2022/2023 full auto report. The research release schedule anticipates newer releases, so the UI should say **2023 reported benchmark, verified September 2026**, without an unqualified “latest 2026 rate” claim.

All 50 states and DC are covered. Raw factual cells retain PDF page number (1-based), printed page, source PDF SHA-256, written house-years, written premiums and 2022 comparison values for the auto data. The complete PDFs and report prose are not redistributed.

Homeowners/renters annual average = aggregate written premium / written house-years, rounded as in the source. A house-year means twelve months of insured exposure. Auto expenditure = all three coverages' written premium / liability-insured car-years, including cars that carry only some coverages. Combined auto premium sums the three separately calculated coverage averages. It must not be labeled a standardized “full coverage” quote. State comparisons have different coverage mixes, limits, deductibles and risk characteristics.

California auto observations are preliminary. Texas exposures involve estimates; its estimated comprehensive exposures affect the combined average but not expenditure. Other material state notes are preserved in the normalized state rows.

## Reproduction and promotion

`npx tsx scripts/ingest-naic-insurance.ts --verify` verifies immutable snapshot hashes, source schema, geography completeness, numeric reconciliation, prior-year movement and exact recorded replay. CI uses the checked-in factual recording and does not require the provider.

`npx tsx scripts/ingest-naic-insurance.ts` downloads the official PDFs to a temporary directory and extracts numeric cells with Poppler `pdftotext`. `--pdf-dir /path/to/source` uses previously downloaded `homeowners.pdf` and `auto.pdf`. Neither mode publishes report prose. Source URLs and exact PDF hashes make the extraction reviewable. No API key is required or stored.

An unrecognized report edition is rejected until a maintainer reviews the dates, definitions and parser. Same-period changes are also rejected by the existing promotion guard. On a new edition, update the edition check, source publication metadata and recorded filename together, inspect representative PDF pages, run the focused data tests and the repository verification suite, and retain prior immutable snapshots. Monthly source-catalog review is appropriate; request-time code reads only the promoted snapshot.
