# ADR 0002: Multilingual catalog document and price variants

- Status: Accepted
- Date: 2026-08-18

## Context

The first real catalogs showed two limitations in `CatalogDocumentV1`:
user-facing text needs multiple languages, and an Item can have several prices
for sizes or other named variants. Existing v1 documents already contain
customer data and must be converted without losing strings, identifiers, or
array ordering.

## Decision

Introduce `CatalogDocumentV2` as the only document contract used by the API and
application runtime.

Initially support the explicit locale set `cnr`, `en`, and `ru`. Store
localized text as an object keyed by locale:

```ts
type LocalizedText = Readonly<Partial<Record<CatalogLocale, string>>>;
```

Each document declares `defaultLocale` and a non-empty, unique
`supportedLocales` array. Required titles and Item names contain the default
locale. Other translations and optional descriptions may be filled gradually.
Every stored translation key must occur in `supportedLocales`.

Replace `Item.price` with an ordered `priceVariants` array:

```ts
type PriceVariant = {
  label?: LocalizedText;
  price: string;
};
```

An Item contains between 1 and 20 variants. A single variant may omit its
label. Multiple variants require unique labels in the default locale. Variants
do not receive IDs because the complete document is replaced at once and no
external consumer refers to individual variants. Currency remains common to
the catalog.

Keep structural TypeBox validation separate from business invariants. The v2
parser remains the trust boundary for HTTP input and JSONB reads.

## Version transition

The application does not permanently support multiple document versions.
After the transition, POST and PUT accept only v2, GET returns only v2, and a
non-v2 stored document is invalid stored data.

Keep the v1 schema and parser only for the finite conversion process. A pure
`convertCatalogDocumentV1ToV2` function receives an explicitly selected locale,
preserves all original values and ordering, and validates its result as v2.

For the current small dataset, use a planned read-only window and convert a
database copy. A command first performs a dry run, then updates all prepared
documents in one transaction when explicitly started with `--write`. Locale
assignments are reviewed manually and stored in the command for the one-time
run. The unchanged v1 database copy is retained for recovery.

## Consequences

- Catalog content can be translated incrementally without inventing fallback
  values in storage.
- Locale keys are unique and directly addressable in JSONB.
- Adding another supported locale requires an explicit schema change.
- Application code handles only one current document version.
- The v1 parser and conversion code can be removed after the recovery period.
- Automatic translation, public fallback, variant IDs, per-variant currencies,
  SKU, inventory, revisions, and publishing workflows remain outside this
  decision.
