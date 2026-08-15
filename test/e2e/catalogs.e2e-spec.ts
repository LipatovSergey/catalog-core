import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { InitialCatalogs1720000000000 } from '../../src/migrations/1720000000000-InitialCatalogs';
import { RemoveCatalogSlug1720000000001 } from '../../src/migrations/1720000000001-RemoveCatalogSlug';

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
}

function catalogDocumentV1(title = 'Summer Menu') {
  return {
    schemaVersion: 1,
    title,
    currency: 'EUR',
    sections: [],
  };
}

function fullCatalogDocumentV1() {
  return {
    schemaVersion: 1,
    title: 'Summer Menu',
    description: 'Seasonal selection',
    currency: 'EUR',
    sections: [
      {
        id: uuid(1),
        title: 'Drinks',
        items: [
          {
            id: uuid(2),
            name: 'Coffee',
            description: 'Freshly brewed coffee',
            price: '12',
            available: true,
          },
          {
            id: uuid(3),
            name: 'Tea',
            price: '8.5',
            available: true,
          },
        ],
      },
      {
        id: uuid(4),
        title: 'Desserts',
        description: 'Made daily',
        items: [
          {
            id: uuid(5),
            name: 'Cake',
            price: '9.50',
            available: false,
          },
        ],
      },
    ],
  };
}

describe('Catalog Core (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;

  beforeAll(async () => {
    database = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      uuidExtension: 'pgcrypto',
      migrations: [
        InitialCatalogs1720000000000,
        RemoveCatalogSlug1720000000001,
      ],
      synchronize: false,
    });
    await database.initialize();
    await database.runMigrations();

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    await database.query('TRUNCATE TABLE "catalogs"');
  });

  afterAll(async () => {
    await app?.close();
    if (database?.isInitialized) {
      await database.destroy();
    }
  });

  it('reports application and PostgreSQL health', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('creates, reads, replaces, and publicly exposes a catalog by UUID', async () => {
    const initialDocument = fullCatalogDocumentV1();
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(initialDocument)
      .expect(201);

    expect(created.body.document).toEqual(initialDocument);
    expect(created.body).not.toHaveProperty('slug');

    const id: string = created.body.id;
    await request(app.getHttpServer())
      .get(`/api/catalogs/${id}`)
      .expect(200)
      .expect(({ body }) => expect(body.document).toEqual(initialDocument));

    const replacement = catalogDocumentV1('Winter Menu');
    await request(app.getHttpServer())
      .put(`/api/catalogs/${id}/document`)
      .send(replacement)
      .expect(200)
      .expect(({ body }) => expect(body.document).toEqual(replacement));

    await request(app.getHttpServer())
      .get(`/api/public/catalogs/${id}`)
      .expect(200)
      .expect(({ body }) => expect(body.document).toEqual(replacement));
  });

  it('returns useful paths for structural validation errors', async () => {
    const invalidDocument = {
      schemaVersion: 1,
      title: 'Summer Menu',
      currency: 'EUR',
      sections: [
        {
          id: 'not-a-uuid',
          title: 'Drinks',
          unknownSectionField: true,
          items: [
            {
              id: uuid(2),
              name: 'Coffee',
              price: 12.5,
              available: 'true',
              unknownItemField: true,
            },
          ],
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(invalidDocument)
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: 'INVALID_CATALOG_DOCUMENT',
          message: 'Catalog document is invalid',
        });
        expect(body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/sections/0/id' }),
            expect.objectContaining({
              path: '/sections/0/unknownSectionField',
            }),
            expect.objectContaining({
              path: '/sections/0/items/0/price',
            }),
            expect.objectContaining({
              path: '/sections/0/items/0/available',
            }),
            expect.objectContaining({
              path: '/sections/0/items/0/unknownItemField',
            }),
          ]),
        );
      });
  });

  it('returns useful paths for business invariant violations', async () => {
    const repeatedSectionId = uuid(1);
    const repeatedItemId = uuid(2);
    const invalidDocument = {
      ...catalogDocumentV1('   '),
      sections: [
        {
          id: repeatedSectionId,
          title: 'First section',
          items: [
            {
              id: repeatedItemId,
              name: 'First item',
              price: '10',
              available: true,
            },
          ],
        },
        {
          id: repeatedSectionId,
          title: 'Second section',
          items: [
            {
              id: repeatedItemId,
              name: 'Second item',
              price: '20',
              available: true,
            },
          ],
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(invalidDocument)
      .expect(400)
      .expect(({ body }) => {
        expect(body.code).toBe('INVALID_CATALOG_DOCUMENT');
        expect(body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/title' }),
            expect.objectContaining({ path: '/sections/1/id' }),
            expect.objectContaining({ path: '/sections/1/items/0/id' }),
          ]),
        );
      });
  });

  it.each([[], null, 'text', 12, true])(
    'rejects a non-object catalog document: %p',
    async (document) => {
      await request(app.getHttpServer())
        .post('/api/catalogs')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(document))
        .expect(400);
    },
  );

  it('returns 404 for unknown administrative and public catalog IDs', async () => {
    const unknownId = '00000000-0000-4000-8000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/catalogs/${unknownId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/public/catalogs/${unknownId}`)
      .expect(404);
  });

  it('uses last-write-wins for sequential full replacements', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(catalogDocumentV1())
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/catalogs/${created.body.id}/document`)
      .send(catalogDocumentV1('First replacement'))
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/catalogs/${created.body.id}/document`)
      .send(catalogDocumentV1('Second replacement'))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/catalogs/${created.body.id}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.document.title).toBe('Second replacement'),
      );
  });

  it('rejects an invalid replacement without changing the stored document', async () => {
    const initialDocument = fullCatalogDocumentV1();
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(initialDocument)
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/catalogs/${created.body.id}/document`)
      .send(catalogDocumentV1('   '))
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('INVALID_CATALOG_DOCUMENT'));

    await request(app.getHttpServer())
      .get(`/api/catalogs/${created.body.id}`)
      .expect(200)
      .expect(({ body }) => expect(body.document).toEqual(initialDocument));
  });

  it('does not expose an invalid document read from PostgreSQL', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(catalogDocumentV1())
      .expect(201);

    await database.query(
      'UPDATE "catalogs" SET "document" = $1::jsonb WHERE "id" = $2',
      [JSON.stringify({ invalid: true }), created.body.id],
    );

    for (const path of [
      `/api/catalogs/${created.body.id}`,
      `/api/public/catalogs/${created.body.id}`,
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .expect(500)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            code: 'INVALID_STORED_CATALOG_DOCUMENT',
            message: 'Stored catalog document is invalid',
          }),
        );
    }
  });

  it('returns 413 when the JSON body exceeds 256kb', async () => {
    await request(app.getHttpServer())
      .post('/api/catalogs')
      .send({ content: 'x'.repeat(270 * 1024) })
      .expect(413);
  });

  it('accepts a valid catalog document below the 256kb limit', async () => {
    const document = {
      ...catalogDocumentV1('Large catalog'),
      sections: Array.from({ length: 100 }, (_, index) => ({
        id: uuid(index + 1),
        title: `Section ${index + 1}`,
        description: 'x'.repeat(1_900),
        items: [],
      })),
    };

    await request(app.getHttpServer())
      .post('/api/catalogs')
      .send(document)
      .expect(201);
  });
});
