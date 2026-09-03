import { HeadObjectCommand } from '@aws-sdk/client-s3';
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

describe('Catalog images using S3 storage (e2e)', () => {
  let app: INestApplication;
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext({ imageStorageDriver: 's3' });
    app = context.app;
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  it('stores an uploaded image in S3 and serves the same bytes publicly', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(emptyCatalogDocument())
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
    const s3 = context.s3;
    if (!s3) {
      throw new Error('S3 test storage was not initialized');
    }
    const stored = await s3.client.send(
      new HeadObjectCommand({
        Bucket: s3.bucket,
        Key: `${catalogId}/${imageKey}`,
      }),
    );
    expect(stored.ContentLength).toBe(PNG_IMAGE.length);
    expect(stored.ContentType).toBe('image/png');

    const imageResponse = await request(app.getHttpServer())
      .get(`/api/public/catalogs/${catalogId}/images/${imageKey}`)
      .expect(200)
      .expect('Content-Type', 'image/png')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('Cache-Control', 'public, max-age=31536000, immutable');

    expect(imageResponse.body).toEqual(PNG_IMAGE);
  });

  it('returns 404 when the image does not exist in S3', async () => {
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
});
