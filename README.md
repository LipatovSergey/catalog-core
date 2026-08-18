# Catalog Core

Catalog Core is a small backend service for creating, storing, replacing, and
publicly reading product catalogs:

```text
Catalog
└── Section
    └── Item
```

A food catalog is the first expected use case, but the contract is not tied to
restaurants. The complete document is validated at runtime and stored in one
PostgreSQL `JSONB` column.

## Requirements

- Node.js 24 or another Node.js release supported by NestJS 11
- pnpm 10
- Docker with Docker Compose

The project was initially verified with Node.js 24.18.0, pnpm 10, Docker 29.6.1,
and Docker Compose 5.3.0.

## Setup

Install dependencies:

```bash
pnpm install
```

Copy `.env.example` to `.env.development` and use the local Docker values:

```dotenv
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=55432
DATABASE_USER=catalog
DATABASE_PASSWORD=catalog_local
DATABASE_NAME=catalog
```

All database variables are required and validated during startup.
`.env.development` is ignored by Git. Production ignores env files and expects
the deployment environment to provide the variables.

Start the development and test PostgreSQL instances:

```bash
docker compose up -d postgres postgres-test
```

Apply or revert development migrations:

```bash
pnpm migration:run
pnpm migration:revert
```

Start the service:

```bash
pnpm start:dev
```

The API uses the `/api` prefix. JSON request bodies are limited to `256kb`.

## Verification

```bash
pnpm lint
pnpm build
pnpm test:unit
pnpm test:e2e
```

Unit tests do not require PostgreSQL. E2E tests use `.env.test` and connect to
the real test PostgreSQL instance on port `55433`. They apply migrations, clear
their data between scenarios, and exercise the complete HTTP-to-database flow.

## Catalog document contract

The canonical runtime contract is defined in
`src/catalogs/document-validation/catalog-document-v2.schema.ts`. TypeBox emits
a JSON Schema object, and the TypeScript `CatalogDocumentV2` type is inferred
from that schema rather than maintained separately.

```ts
type CatalogLocale = 'cnr' | 'en' | 'ru';
type LocalizedText = Readonly<Partial<Record<CatalogLocale, string>>>;

type CatalogDocumentV2 = {
  schemaVersion: 2;
  defaultLocale: CatalogLocale;
  supportedLocales: CatalogLocale[];
  title: LocalizedText;
  description?: LocalizedText;
  currency: string;
  sections: Array<{
    id: string;
    title: LocalizedText;
    description?: LocalizedText;
    items: Array<{
      id: string;
      name: LocalizedText;
      description?: LocalizedText;
      priceVariants: Array<{
        label?: LocalizedText;
        price: string;
      }>;
      available: boolean;
    }>;
  }>;
};
```

Structural constraints:

- unknown properties are rejected at every object level;
- the supported locale set is `cnr`, `en`, and `ru`;
- `supportedLocales` contains 1–3 unique values;
- each LocalizedText contains 1–3 translations;
- title, name, and label translations are 1–200 characters;
- description translations are 1–2,000 characters;
- `currency` contains exactly three uppercase ASCII letters;
- Section and Item identifiers are UUIDs, with no required UUID version;
- a catalog contains at most 100 sections;
- a section contains at most 500 items;
- an Item contains 1–20 ordered price variants;
- `price` is a non-negative decimal string with at most two fractional digits
  and at most ten integer digits;
- `available` is an explicit boolean;
- empty `sections` and `items` arrays are allowed;
- optional fields are omitted rather than supplied as `null`.

Accepted prices include `"0"`, `"0.5"`, `"12"`, and `"12.50"`. Values such as
`12.5`, `"-1"`, `"01.50"`, `"1."`, and `"1.234"` are rejected.

The three-letter currency rule validates the format only; it does not maintain
or validate against the complete ISO 4217 currency list.

Business invariants are intentionally implemented outside JSON Schema:

- `defaultLocale` occurs in `supportedLocales`;
- every translation key occurs in `supportedLocales`;
- required titles and Item names contain a default-locale translation;
- translations cannot consist only of whitespace;
- multiple price variants contain unique default-locale labels;
- Section IDs are unique within a catalog;
- Item IDs are unique across the complete catalog;
- a catalog contains at most 5,000 items in total.

## Validation boundary

The public validation operation is:

```ts
parseCatalogDocumentV2(value: unknown): CatalogDocumentV2
```

The schema is compiled once with TypeBox `TypeCompiler`. HTTP bodies pass
through a Nest pipe before reaching the controller and service. The persistence
entity keeps `document: unknown`, and documents read from PostgreSQL pass
through the same parser before being returned by administrative or public APIs.

```text
HTTP unknown → structural validation → business invariants → CatalogDocumentV2
JSONB unknown → structural validation → business invariants → CatalogDocumentV2
```

## API

Create a catalog by sending its complete document:

```bash
curl -X POST http://localhost:3000/api/catalogs \
  -H 'Content-Type: application/json' \
  -d '{
    "schemaVersion": 2,
    "defaultLocale": "en",
    "supportedLocales": ["en"],
    "title": { "en": "Summer selection" },
    "currency": "EUR",
    "sections": []
  }'
```

Replace the complete document:

```bash
curl -X PUT http://localhost:3000/api/catalogs/CATALOG_ID/document \
  -H 'Content-Type: application/json' \
  -d '{
    "schemaVersion": 2,
    "defaultLocale": "en",
    "supportedLocales": ["en", "ru"],
    "title": {
      "en": "Winter selection",
      "ru": "Зимнее меню"
    },
    "currency": "EUR",
    "sections": [
      {
        "id": "d9428888-122b-4ff8-b234-cf471b0d1234",
        "title": { "en": "Featured", "ru": "Избранное" },
        "items": [
          {
            "id": "7b42981d-2928-4b24-93a1-84ca9b954342",
            "name": { "en": "Example item", "ru": "Пример" },
            "priceVariants": [
              {
                "label": { "en": "Regular", "ru": "Обычный" },
                "price": "12.00"
              }
            ],
            "available": true
          }
        ]
      }
    ]
  }'
```

Read administratively or publicly by the server-generated catalog UUID:

```bash
curl http://localhost:3000/api/catalogs/CATALOG_ID
curl http://localhost:3000/api/public/catalogs/CATALOG_ID
```

`PUT` performs a complete replacement. Merge, `PATCH`, and JSON Patch are not
supported.

## Validation errors

An invalid client document returns `400 Bad Request` without reaching the
service:

```json
{
  "statusCode": 400,
  "code": "INVALID_CATALOG_DOCUMENT",
  "message": "Catalog document is invalid",
  "errors": [
    {
      "path": "/sections/0/items/0/priceVariants/0/price",
      "message": "Expected string"
    }
  ],
  "path": "/api/catalogs"
}
```

A document corrupted through manual SQL or another writer is never returned as
a valid catalog. Administrative and public reads return:

```json
{
  "statusCode": 500,
  "code": "INVALID_STORED_CATALOG_DOCUMENT",
  "message": "Stored catalog document is invalid",
  "path": "/api/catalogs/CATALOG_ID"
}
```

Detailed stored-data errors are not exposed to the client.

## Database

The only domain table is `catalogs`:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `document JSONB NOT NULL`
- `created_at TIMESTAMP NOT NULL DEFAULT now()`
- `updated_at TIMESTAMP NOT NULL DEFAULT now()`

TypeORM synchronization is disabled in every environment. Schema changes are
made only through migrations.

## Converting stored v1 documents

The API and application runtime accept only v2. The v1 schema, parser, and
conversion functions exist only for the one-time data transition.

Before conversion, review the locale assigned to every catalog ID in
`convert-catalog-documents-v1-to-v2.command.ts`. Do not infer a locale from the
stored text.

Build the project and run the command without a flag to validate every v1
document and prepare v2 documents without writing them:

```bash
pnpm build
NODE_ENV=development node \
  dist/catalogs/document-validation/document-conversion/convert-catalog-documents-v1-to-v2.command.js
```

After reviewing the dry-run output and retaining a copy of the v1 database,
run the transactional conversion explicitly:

```bash
NODE_ENV=development node \
  dist/catalogs/document-validation/document-conversion/convert-catalog-documents-v1-to-v2.command.js \
  --write
```

The command validates all source documents as v1 and all results as v2 before
updating them in one transaction. Run it only against the intended database
copy while application writes are disabled.

## Architecture decision

The TypeBox and validation decision is documented in
[ADR 0001](docs/adr/0001-catalog-document-runtime-contract.md).
The multilingual v2 contract and data transition are documented in
[ADR 0002](docs/adr/0002-catalog-document-v2.md).

## Deliberate limitations

- The entire document is stored in one `JSONB` value.
- Saving completely replaces the previous document.
- Concurrent changes use last-write-wins with no optimistic concurrency.
- Draft and published states are not separated.
- Administrative and public APIs read the same immediately visible document.
- There are no users or authorization.
- Redis, AI integration, image handling, search, and events are absent.
- Locale support is currently limited to `cnr`, `en`, and `ru`.
- Legacy v1 code is retained only for the finite data conversion.

## Future direction

Potential later work includes optimistic concurrency, immutable revisions,
separate draft and published states, additional locales, public translation
fallback, AI-assisted import, external AuthCore integration, object storage,
public caching, search, and an outbox when real event consumers exist.
