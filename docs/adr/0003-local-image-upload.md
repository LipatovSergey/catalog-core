# ADR 0003: Local image upload and logical image keys

- Status: Accepted
- Date: 2026-08-28

## Context

Catalog items need optional images. The complete `CatalogDocumentV2` remains a
single PostgreSQL `JSONB` value, but storing image bytes inside that document
would increase document size, mix binary storage with catalog validation, and
make a later move to object storage harder.

The first implementation targets a small product and local application storage.
It must accept browser uploads, reject unsupported content, avoid unsafe client
paths and file replacement, and retain the existing TypeBox runtime boundary.
S3-compatible storage, signed URLs, background processing, draft and published
states, and automatic orphan cleanup remain outside this stage.

## Decision

### Catalog contract

Extend `CatalogDocumentV2` rather than introduce v3. An Item may contain:

```ts
imageKey?: string;
```

This is a backward-compatible addition because existing v2 documents omit the
optional property. `imageKey` is a logical identifier with this form:

```text
<lowercase UUID>.<jpg|png|webp>
```

The TypeBox schema rejects absolute URLs, physical paths, traversal segments,
unsupported extensions, and additional text around the key. An Item stores no
image bytes, storage root, or temporary read URL.

### Separate upload and document replacement

Upload one image per request:

```http
POST /api/catalogs/:catalogId/images
Content-Type: multipart/form-data
```

The multipart field name is `file`. A successful request returns:

```json
{
  "imageKey": "550e8400-e29b-41d4-a716-446655440000.webp"
}
```

The upload endpoint verifies that the catalog exists but does not select or
modify an Item. The client places the returned key into its local document and
uses the existing full replacement operation:

```http
PUT /api/catalogs/:catalogId/document
```

For initial creation, the client creates a catalog without new image keys,
uploads selected images after receiving the catalog ID, then replaces the
document with the returned keys. Multiple single-file uploads may run in
parallel. A batch multipart contract is not introduced.

### Upload validation

Use Nest's Express `FileInterceptor` and Multer's in-memory buffering. Limit an
individual file to 5 MiB. This is acceptable for the current small number of
clients and images and permits validation before any filesystem write.

Do not trust the client-provided filename, extension, or MIME type. Detect the
supported container from content signatures:

- JPEG starts with `FF D8 FF`;
- PNG starts with its eight-byte standard signature;
- WebP contains the `RIFF` and `WEBP` markers in their expected positions.

Reject other content with `400 UNSUPPORTED_IMAGE_TYPE`. Reject a missing file
with `400 IMAGE_FILE_REQUIRED`. Signature checking identifies the expected
container but does not fully decode the image; full decoder validation is not
added at this stage.

Generate the image key on the server with `randomUUID()` and a canonical
extension derived from the detected signature. Never use the original filename
as a storage name.

### Local storage

Place image concerns in a small `ImagesModule`, separate from the catalog JSONB
service. Configure the physical root through the required environment variable:

```dotenv
IMAGE_STORAGE_DIR=./var/catalog-images
```

Resolve it once to an absolute path. Store a file under:

```text
<IMAGE_STORAGE_DIR>/<catalogId>/<imageKey>
```

`LocalImageStorageService` receives only the catalog ID, logical key, and a
Node.js `Buffer`. It validates the catalog ID and image key again, normalizes
the catalog UUID to lowercase, creates the catalog directory recursively, and
writes with the exclusive `wx` flag. Existing files are therefore not
overwritten.

The resolved destination is also checked to remain below the configured root.
The physical path is never exposed through the catalog contract or upload
response.

### Public reading

Serve stored bytes through the backend:

```http
GET /api/public/catalogs/:catalogId/images/:imageKey
```

Reuse the same image-key validation and safe local path resolution as writes.
Return `400 INVALID_IMAGE_KEY` for an invalid key and translate only a missing
file (`ENOENT`) into `404 IMAGE_NOT_FOUND`; unexpected filesystem errors remain
server errors.

Return a Nest `StreamableFile` with the canonical media type derived from the
validated key. Send `X-Content-Type-Options: nosniff`. Because keys are unique
and existing files cannot be overwritten, responses use long-lived immutable
public caching.

### Test isolation

Filesystem unit tests use a unique directory created with `mkdtemp()`, exercise
real byte writes and exclusive creation, and remove the directory after every
test.

E2E bootstrap creates a separate temporary image root before importing
`AppModule`, assigns it to `IMAGE_STORAGE_DIR`, and removes it after closing the
application and database. The dynamic import is required because environment
validation runs while `AppModule` is loaded.

## Alternatives considered

### Store image bytes or base64 in JSONB

Rejected because it couples catalog replacement to binary transfer, enlarges
the document, and obstructs later storage migration.

### Store an absolute URL or physical path in Item

Rejected because deployment paths and future signed URLs are not stable domain
identifiers. Changing physical storage must not require rewriting catalog
documents.

### Introduce `CatalogDocumentV3`

Rejected because optional `imageKey` does not invalidate existing v2 documents.
The additional conversion and temporary multi-version handling would not help
the image-upload exercise.

### Upload all files together with the complete catalog

Rejected because PostgreSQL and the filesystem do not share a transaction. A
single request would need item-to-file mapping and rollback of files already
written when a later file or the document fails. Separate requests support
per-file progress and retry.

### Write Multer files directly to disk

Not selected because rejected uploads would require temporary-file cleanup and
validation would occur after a filesystem write. Memory buffering is simpler
under the 5 MiB limit.

### Add draft or published state

Not selected because the product does not currently model publication. During
initial creation, a catalog may briefly exist without its final image keys. The
client exposes the public link only after uploads and the final document
replacement succeed.

## Consequences

- Catalog documents retain only stable logical image references.
- Upload and full document replacement remain independent and retryable.
- A failed or abandoned editor flow can leave an unreferenced local file.
- Replacing an image can leave the previous file unreferenced after a successful
  document replacement.
- Automatic deletion is intentionally deferred; later inventory can compare
  stored files with image keys referenced by catalog documents.
- The local directory must be persistent in deployment. A containerized
  application will require a mounted volume.
- Memory usage per concurrent upload is bounded by the 5 MiB Multer limit.
- The storage location can later move behind a small storage abstraction without
  changing `CatalogDocumentV2` or the meaning of `imageKey`.

## Implementation status

The v2 contract extension, configurable local storage, safe exclusive write and
read, signature-based upload service, multipart and public-read controllers,
and isolated filesystem test setup are implemented.

E2E scenarios exercise real multipart upload, local byte storage, image-key
document replacement, public byte reading, size and content rejection, missing
resources, and invalid keys through an isolated temporary directory.
