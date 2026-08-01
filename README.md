# Catalog Core

Catalog Core is a small backend service for creating, storing, replacing, and
publicly reading product catalogs. The future neutral model is:

```text
Catalog
└── Section
    └── Item
```

A catalog of food offered by a restaurant is the first expected use case, but
the service and its API are not tied to that domain.

This initial prototype deliberately treats a catalog document as an opaque JSON
object. PostgreSQL stores the complete value in one `JSONB` column.

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

Copy `.env.example` to `.env`, then use local development values:

```dotenv
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=55432
DATABASE_USER=catalog
DATABASE_PASSWORD=catalog_local
DATABASE_NAME=catalog
```

All database variables are required and validated during startup. The example
file contains placeholders only; do not commit real credentials.

Start the development and test PostgreSQL instances:

```bash
docker compose up -d postgres postgres-test
```

Apply or revert the migration:

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
npm run test:e2e
```

Integration tests connect to the real test PostgreSQL instance on port `55433`.
They create their own data and clear it between scenarios.

## API examples

Check the application and database:

```bash
curl http://localhost:3000/api/health
```

Create a catalog. A slug is normalized with `trim()` and lowercase conversion.
It may contain lowercase ASCII letters, numbers, and single separating hyphens,
up to 100 characters.

```bash
curl -X POST http://localhost:3000/api/catalogs \
  -H 'Content-Type: application/json' \
  -d '{"slug":"summer-catalog"}'
```

Replace its complete document:

```bash
curl -X PUT http://localhost:3000/api/catalogs/CATALOG_ID/document \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Summer selection",
    "sections": [
      {
        "name": "Featured",
        "items": [{"name": "Example item", "price": 12}]
      }
    ],
    "anyUnknownField": {"isPreserved": true}
  }'
```

Read it administratively:

```bash
curl http://localhost:3000/api/catalogs/CATALOG_ID
```

Read the same document publicly:

```bash
curl http://localhost:3000/api/public/catalogs/summer-catalog
```

## Database

The only domain table is `catalogs`:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `slug VARCHAR NOT NULL UNIQUE`
- `document JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMP NOT NULL DEFAULT now()`
- `updated_at TIMESTAMP NOT NULL DEFAULT now()`

TypeORM synchronization is disabled in every environment. Schema changes are
made only through migrations.

## Deliberate prototype limitations

- The `document` structure is not formalized.
- There is no agreed `CatalogDocument`.
- Nested fields have no runtime validation.
- TypeScript does not know the document structure.
- TypeBox is not installed yet.
- The entire document is stored in one `JSONB` value.
- Saving completely replaces the previous document.
- Concurrent changes use last-write-wins with no optimistic concurrency.
- Draft and published states are not separated.
- Administrative and public APIs read the same immediately visible document.
- There are no users or authorization.
- Redis, AI integration, image handling, search, and events are absent.
- No legacy or demonstration catalogs are created.

## Future direction

Potential later steps are a single TypeBox contract for `Catalog`, `Section`,
and `Item`; runtime validation and inferred TypeScript types; optimistic
concurrency; immutable revisions and separate draft/published states;
multilingual content; AI-assisted import into a reviewable draft; external
AuthCore integration; object storage; public caching; search; and an outbox
only when real event consumers exist.
# catalog-core
