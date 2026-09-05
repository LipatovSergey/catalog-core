import { HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { type INestApplication } from '@nestjs/common';
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
    const stored = await context.s3.client.send(
      new HeadObjectCommand({
        Bucket: context.s3.bucket,
        Key: `${catalogId}/${imageKey}`,
      }),
    );
    expect(stored.ContentLength).toBe(PNG_IMAGE.length);
    expect(stored.ContentType).toBe('image/png');

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
    const publicCatalog = await request(app.getHttpServer())
      .get(`/api/public/catalogs/${catalogId}`)
      .expect(200);
    expect(publicCatalog.body.document.sections[0].items[0].imageKey).toBe(
      imageKey,
    );
    const publicUrl: string = publicCatalog.body.imageUrls[imageKey];
    expect(publicUrl).toBe(
      `http://localhost:9000/${context.s3.bucket}/${catalogId}/${imageKey}`,
    );

    const imageResponse = await fetch(publicUrl);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await imageResponse.arrayBuffer())).toEqual(PNG_IMAGE);

    await request(app.getHttpServer())
      .get(`/api/public/catalogs/${catalogId}/images/${imageKey}`)
      .expect(404);
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

    await expectBucketToBeEmpty(context);
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

    await expectBucketToBeEmpty(context);
  });

  it('does not store an image for an unknown catalog', async () => {
    const unknownCatalogId = '00000000-0000-4000-8000-000000000000';

    await request(app.getHttpServer())
      .post(`/api/catalogs/${unknownCatalogId}/images`)
      .attach('file', PNG_IMAGE, 'dish.png')
      .expect(404);

    await expectBucketToBeEmpty(context);
  });
});

async function expectBucketToBeEmpty(context: E2eTestContext): Promise<void> {
  const result = await context.s3.client.send(
    new ListObjectsV2Command({ Bucket: context.s3.bucket }),
  );
  expect(result.Contents ?? []).toEqual([]);
}
