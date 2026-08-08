# ADR 0001: Catalog document runtime contract

- Status: Accepted
- Date: 2026-08-08

## Context

Catalog Core stores a complete catalog document in PostgreSQL `JSONB`.
PostgreSQL guarantees valid JSON storage but does not guarantee that the value
contains a usable catalog. HTTP input and values read from PostgreSQL are
runtime values, so TypeScript types alone cannot validate them.

The contract must provide JSON Schema, runtime validation, inferred TypeScript
types, useful error paths, and the same validation behavior on write and read.
The project uses TypeScript 6.0.3 and CommonJS and has no legacy catalog formats
to preserve.

## Decision

Use `@sinclair/typebox` 0.34.52 as the schema library. The dependency is pinned
to an exact version. TypeBox 0.x is the maintained line compatible with
TypeScript 6 and CommonJS; TypeBox 1.x is ESM-only.

Define one canonical `CatalogDocumentSchema` and infer `CatalogDocument` with
`Static<typeof CatalogDocumentSchema>`. Nested Item and Section schemas remain
private implementation details because the service only accepts complete
catalog documents.

Compile the schema once at module initialization with `TypeCompiler`. The parser
uses the compiled `Check()` type guard on the successful path and collects
detailed errors only after a failed check.

TypeBox represents UUID through the standard JSON Schema `format: "uuid"` but
does not provide the runtime format implementation in this version. Register
the existing `class-validator` `isUUID` function through TypeBox
`FormatRegistry`.

Expose one library boundary:

```ts
parseCatalogDocument(value: unknown): CatalogDocument
```

Nest controllers use a thin pipe that translates parser failures into
`400 INVALID_CATALOG_DOCUMENT`. Persistence keeps the JSONB value typed as
`unknown`; services parse it after every database read. Invalid stored data
returns `500 INVALID_STORED_CATALOG_DOCUMENT` and is never exposed as a valid
catalog.

Keep structural and business validation separate:

- JSON Schema checks types, required and optional properties, literals,
  patterns, UUID format, local string and array limits, and unknown fields.
- A typed invariant validator checks whitespace-only strings, uniqueness of
  nested IDs, and the total number of items across sections.

## Alternatives considered

### TypeScript interfaces only

Rejected because interfaces disappear at runtime and cannot validate HTTP or
PostgreSQL values.

### Nest DTOs with class-validator

Retained for transport-specific DTOs where appropriate, but rejected as the
catalog document source of truth because it does not directly produce the
canonical JSON Schema and would duplicate static and runtime declarations.

### Zod

Zod can provide runtime validation and inferred types, but JSON Schema is not
its primary representation. TypeBox more directly matches the schema-first
requirement.

### TypeBox with Ajv and ajv-formats

Not selected because TypeBox's built-in compiler provides the required runtime
checking and error paths. Adding two more dependencies solely for UUID format
validation was unnecessary. This can be reconsidered if broader JSON Schema
dialect or format support becomes necessary.

### TypeBox Value API

The Value API is suitable for direct and one-off validation. TypeCompiler was
selected because Catalog Core validates the same schema repeatedly in a
long-running Node.js process and can compile it once during module loading.

## Consequences

- The JSON Schema and TypeScript type cannot drift because the type is inferred
  from the schema.
- Incoming and stored documents share the same trust boundary.
- The schema can later be consumed by OpenAPI or structured-output tooling,
  subject to compatibility with their supported JSON Schema subset.
- TypeCompiler dynamically generates JavaScript during initialization. This is
  acceptable in the current Node.js deployment but may not work in environments
  that prohibit dynamic code generation.
- UUID validation relies on global TypeBox format registration and must occur
  before document checks.
- Business invariants remain ordinary TypeScript and are not represented in the
  exported JSON Schema. External schema consumers must enforce them separately.
- Replacing TypeBox requires rewriting the schema and parser internals plus
  their focused tests. Controllers, services, and persistence depend only on
  `CatalogDocument` and `parseCatalogDocument`, limiting the replacement cost.

## References

- [TypeBox repository and version compatibility](https://github.com/sinclairzx81/typebox)
- [NestJS pipes](https://docs.nestjs.com/pipes)
- [NestJS exception filters](https://docs.nestjs.com/exception-filters)
