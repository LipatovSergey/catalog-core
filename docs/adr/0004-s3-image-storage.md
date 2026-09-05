# ADR 0004: S3-compatible image storage and public reads

- Status: Accepted
- Date: 2026-09-03

## Context

ADR 0003 introduced logical image keys and local filesystem storage as the
first image implementation. Catalog Core now needs one storage model for local
development, automated tests, and production. There are no production images
on the local filesystem, so no file migration or transitional read fallback is
required.

Catalogs and their images are public. Restricting image reads with temporary
signed URLs would add expiration and renewal behavior without protecting data
that the public catalog already exposes.

## Decision

Use S3-compatible object storage as the only physical image storage. Use MinIO
in development and E2E tests and Amazon S3 in production.

Keep `ImageStorage` as the dependency-injection boundary around the AWS SDK.
It exposes image writes and public URL construction. The concrete
`S3ImageStorageService` stores objects under:

```text
<catalogId>/<imageKey>
```

Writes retain the content-derived media type and `If-None-Match: *` protection
against replacement. `CatalogDocumentV2` continues to store only the stable
logical `imageKey`; it never stores an endpoint, bucket name, or public URL.

Configure the externally reachable prefix separately through
`S3_PUBLIC_BASE_URL`. This permits MinIO, direct S3, or a future CDN address
without changing stored catalog documents.

The public catalog response preserves `document` unchanged and adds:

```json
{
  "imageUrls": {
    "<imageKey>": "<S3_PUBLIC_BASE_URL>/<catalogId>/<imageKey>"
  }
}
```

Allow anonymous `s3:GetObject` for image objects. Anonymous listing, upload,
and deletion remain forbidden. Bucket policy remains infrastructure
configuration: `minio-init` applies the development policy, while production
S3 must be configured separately.

Clients read images directly from object storage. Remove the backend image-read
endpoint, filesystem implementation, storage-driver switch, and related
not-found translation.

E2E suites create their own MinIO bucket, apply the public-read policy, exercise
real multipart upload and anonymous direct reading, and delete all objects and
the bucket during teardown.

## Alternatives considered

### Retain local storage for development and tests

Rejected because MinIO already provides the production-compatible API locally.
Maintaining an unused filesystem branch adds configuration and tests while
reducing confidence that development exercises the production storage path.

### Keep the bucket private and return signed URLs

Rejected because catalogs and images are public. Expiring URLs would add client
renewal behavior without enforcing a meaningful access boundary.

### Proxy image reads through the backend

Rejected because it routes object bytes and long-lived connections through the
application without adding authorization. Direct object reads keep the backend
out of the binary delivery path.

### Store the public URL in `CatalogDocumentV2`

Rejected because URLs depend on the environment and delivery infrastructure.
Changing MinIO, S3 region, domain, or CDN must not require rewriting JSONB
documents.

## Consequences

- Development and E2E execution require MinIO.
- Production requires an S3 bucket and a narrowly scoped public-read policy.
- Changing the public image host requires only configuration changes.
- Anyone who knows an object URL can read it, including an unreferenced upload.
- Uploads still require backend credentials and catalog existence.
- Automatic orphan cleanup and deletion remain outside the current scope.
- No local-file inventory, copy, checksum migration, or read fallback is needed
  because no production local images exist.
