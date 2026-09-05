import { type INestApplication } from '@nestjs/common';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import {
  createE2eTestContext,
  type E2eTestContext,
} from './support/e2e-test-context';

const PNG_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SECTION_ID = '00000000-0000-4000-8000-000000000001';
const ITEM_ID = '00000000-0000-4000-8000-000000000002';

function catalogDocumentWithItem() {
  return {
    schemaVersion: 2,
    defaultLocale: 'en',
    supportedLocales: ['en'],
    title: { en: 'Summer Menu' },
    currency: 'EUR',
    sections: [
      {
        id: SECTION_ID,
        title: { en: 'Drinks' },
        items: [
          {
            id: ITEM_ID,
            name: { en: 'Coffee' },
            priceVariants: [{ price: '8' }],
            available: true,
          },
        ],
      },
    ],
  };
}

function emptyCatalogDocument() {
  return {
    schemaVersion: 2,
    defaultLocale: 'en',
    supportedLocales: ['en'],
    title: { en: 'Summer Menu' },
    currency: 'EUR',
    sections: [],
  };
}

describe('Catalog images (e2e)', () => {
  let app: INestApplication;
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext();
    app = context.app;
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  it('uploads an image, stores its key in an item, and serves the same bytes publicly', async () => {
    const initialDocument = catalogDocumentWithItem();
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(initialDocument)
      .expect(201);
    const catalogId: string = created.body.id;

    const uploaded = await request(app.getHttpServer())
      .post(`/api/catalogs/${catalogId}/images`)
      .attach('file', PNG_IMAGE, {
        filename: 'dish.txt',
        contentType: 'application/octet-stream',
      })
      .expect(201);

    const imageKey: string = uploaded.body.imageKey;
    expect(imageKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/,
    );
    await expect(
      readFile(join(context.imageStorageDirectory, catalogId, imageKey)),
    ).resolves.toEqual(PNG_IMAGE);

    const documentWithImage = {
      ...initialDocument,
      sections: initialDocument.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, imageKey })),
      })),
    };

    await request(app.getHttpServer())
      .put(`/api/catalogs/${catalogId}/document`)
      .send(documentWithImage)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/public/catalogs/${catalogId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.document.sections[0].items[0].imageKey).toBe(imageKey);
        expect(body.imageUrls).toEqual({
          [imageKey]: `/api/public/catalogs/${catalogId}/images/${imageKey}`,
        });
      });

    const imageResponse = await request(app.getHttpServer())
      .get(`/api/public/catalogs/${catalogId}/images/${imageKey}`)
      .expect(200)
      .expect('Content-Type', 'image/png')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('Cache-Control', 'public, max-age=31536000, immutable');

    expect(imageResponse.body).toEqual(PNG_IMAGE);
  });

  it('rejects an upload without a file', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(emptyCatalogDocument())
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/catalogs/${created.body.id}/images`)
      .field('description', 'no file')
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('IMAGE_FILE_REQUIRED'));
  });

  it('rejects content whose bytes are not a supported image', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(emptyCatalogDocument())
      .expect(201);
    const catalogId: string = created.body.id;

    await request(app.getHttpServer())
      .post(`/api/catalogs/${catalogId}/images`)
      .attach('file', Buffer.from('not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('UNSUPPORTED_IMAGE_TYPE'));

    await expect(
      access(join(context.imageStorageDirectory, catalogId)),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns 413 without storing an image larger than 5 MiB', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(emptyCatalogDocument())
      .expect(201);
    const catalogId: string = created.body.id;

    await request(app.getHttpServer())
      .post(`/api/catalogs/${catalogId}/images`)
      .attach('file', Buffer.alloc(MAX_IMAGE_SIZE + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(413);

    await expect(
      access(join(context.imageStorageDirectory, catalogId)),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not store an image for an unknown catalog', async () => {
    const unknownCatalogId = '00000000-0000-4000-8000-000000000000';

    await request(app.getHttpServer())
      .post(`/api/catalogs/${unknownCatalogId}/images`)
      .attach('file', PNG_IMAGE, 'dish.png')
      .expect(404);

    await expect(
      access(join(context.imageStorageDirectory, unknownCatalogId)),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns 404 for an unknown image key', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(emptyCatalogDocument())
      .expect(201);
    const unknownImageKey = '550e8400-e29b-41d4-a716-446655440000.webp';

    await request(app.getHttpServer())
      .get(`/api/public/catalogs/${created.body.id}/images/${unknownImageKey}`)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('IMAGE_NOT_FOUND'));
  });

  it.each(['not-an-image-key', '..%2Fsecret.png'])(
    'rejects the invalid public image key %s',
    async (imageKey) => {
      const created = await request(app.getHttpServer())
        .post('/api/catalogs')
        .send(emptyCatalogDocument())
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/public/catalogs/${created.body.id}/images/${imageKey}`)
        .expect(400)
        .expect(({ body }) => expect(body.code).toBe('INVALID_IMAGE_KEY'));
    },
  );
});
