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
- npm 11
- Docker with Docker Compose

The project was initially verified with Node.js 24.18.0, npm 11.16.0, Docker
29.6.1, and Docker Compose 5.3.0.

## Setup

Install dependencies:

```bash
npm install
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
npm run migration:run
npm run migration:revert
```

Start the service:

```bash
npm run start:dev
```

The API uses the `/api` prefix. JSON request bodies are limited to `256kb`.

## Verification

```bash
npm run lint
npm run build
npm run test:unit
npm run test:e2e
```

Unit tests do not require PostgreSQL. E2E tests use `.env.test` and connect to
the real test PostgreSQL instance on port `55433`. They apply migrations, clear
their data between scenarios, and exercise the complete HTTP-to-database flow.

## Catalog document contract

The canonical runtime contract is defined in
`src/catalogs/document-validation/catalog-document.schema.ts`. TypeBox emits a
JSON Schema object, and the TypeScript `CatalogDocument` type is inferred from
that schema rather than maintained separately.

```ts
type CatalogDocument = {
  schemaVersion: 1;
  title: string;
  description?: string;
  currency: string;
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    items: Array<{
      id: string;
      name: string;
      description?: string;
      price: string;
      available: boolean;
    }>;
  }>;
};
```

Structural constraints:

- unknown properties are rejected at every object level;
- catalog, section, and item names are 1–200 characters;
- descriptions are optional and 1–2,000 characters when present;
- `currency` contains exactly three uppercase ASCII letters;
- Section and Item identifiers are UUIDs, with no required UUID version;
- a catalog contains at most 100 sections;
- a section contains at most 500 items;
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

- user-facing strings cannot consist only of whitespace;
- Section IDs are unique within a catalog;
- Item IDs are unique across the complete catalog;
- a catalog contains at most 5,000 items in total.

## Validation boundary

The public validation operation is:

```ts
parseCatalogDocument(value: unknown): CatalogDocument
```

The schema is compiled once with TypeBox `TypeCompiler`. HTTP bodies pass
through a Nest pipe before reaching the controller and service. The persistence
entity keeps `document: unknown`, and documents read from PostgreSQL pass
through the same parser before being returned by administrative or public APIs.

```text
HTTP unknown → structural validation → business invariants → CatalogDocument
JSONB unknown → structural validation → business invariants → CatalogDocument
```

## API

Create a catalog by sending its complete document:

```bash
curl -X POST http://localhost:3000/api/catalogs \
  -H 'Content-Type: application/json' \
  -d '{
    "schemaVersion": 1,
    "title": "Summer selection",
    "currency": "EUR",
    "sections": []
  }'
```

Replace the complete document:

```bash
curl -X PUT http://localhost:3000/api/catalogs/CATALOG_ID/document \
  -H 'Content-Type: application/json' \
  -d '{
    "schemaVersion": 1,
    "title": "Winter selection",
    "currency": "EUR",
    "sections": [
      {
        "id": "d9428888-122b-4ff8-b234-cf471b0d1234",
        "title": "Featured",
        "items": [
          {
            "id": "7b42981d-2928-4b24-93a1-84ca9b954342",
            "name": "Example item",
            "price": "12.00",
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
      "path": "/sections/0/items/0/price",
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

## Architecture decision

The TypeBox and validation decision is documented in
[ADR 0001](docs/adr/0001-catalog-document-runtime-contract.md).

## Deliberate limitations

- The entire document is stored in one `JSONB` value.
- Saving completely replaces the previous document.
- Concurrent changes use last-write-wins with no optimistic concurrency.
- Draft and published states are not separated.
- Administrative and public APIs read the same immediately visible document.
- There are no users or authorization.
- Redis, AI integration, image handling, search, and events are absent.
- There are no legacy or demonstration catalog formats.

## Future direction

Potential later work includes optimistic concurrency, immutable revisions,
separate draft and published states, multilingual content, AI-assisted import,
external AuthCore integration, object storage, public caching, search, and an
outbox when real event consumers exist.
