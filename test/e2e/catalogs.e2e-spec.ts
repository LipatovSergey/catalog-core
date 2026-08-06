import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { InitialCatalogs1720000000000 } from '../../src/migrations/1720000000000-InitialCatalogs';

process.env.DATABASE_HOST ??= 'localhost';
process.env.DATABASE_PORT ??= '55433';
process.env.DATABASE_USER ??= 'catalog_test';
process.env.DATABASE_PASSWORD ??= 'catalog_test';
process.env.DATABASE_NAME ??= 'catalog_test';

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
      migrations: [InitialCatalogs1720000000000],
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
    await app.close();
    await database.destroy();
  });

  it('reports application and PostgreSQL health', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('creates, reads, replaces, and publicly exposes a catalog', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send({ slug: '  Summer-Catalog  ' })
      .expect(201);

    expect(created.body.slug).toBe('summer-catalog');
    expect(created.body.document).toEqual({});

    const id: string = created.body.id;
    await request(app.getHttpServer())
      .get(`/api/catalogs/${id}`)
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(id));

    const firstDocument = {
      arbitrary: { nested: [1, true, null, { retained: 'yes' }] },
      unknownField: 'preserved',
    };
    await request(app.getHttpServer())
      .put(`/api/catalogs/${id}/document`)
      .send(firstDocument)
      .expect(200)
      .expect(({ body }) => expect(body.document).toEqual(firstDocument));

    await request(app.getHttpServer())
      .get('/api/public/catalogs/summer-catalog')
      .expect(200)
      .expect(({ body }) => expect(body.document).toEqual(firstDocument));

    const replacement = { replacement: true };
    await request(app.getHttpServer())
      .put(`/api/catalogs/${id}/document`)
      .send(replacement)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/public/catalogs/summer-catalog')
      .expect(200)
      .expect(({ body }) => {
        expect(body.document).toEqual(replacement);
        expect(body.document).not.toHaveProperty('arbitrary');
      });
  });

  it('rejects invalid slugs and duplicate normalized slugs', async () => {
    for (const slug of ['', '-invalid', 'invalid--slug', 'not_valid']) {
      await request(app.getHttpServer())
        .post('/api/catalogs')
        .send({ slug })
        .expect(400);
    }

    await request(app.getHttpServer())
      .post('/api/catalogs')
      .send({ slug: 'duplicate' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/catalogs')
      .send({ slug: ' DUPLICATE ' })
      .expect(409);
  });

  it.each([[], null, 'text', 12, true])(
    'rejects a non-object document root: %p',
    async (document) => {
      const created = await request(app.getHttpServer())
        .post('/api/catalogs')
        .send({ slug: `root-${typeof document}-${String(document).length}` })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/api/catalogs/${created.body.id}/document`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(document))
        .expect(400);
    },
  );

  it('returns 404 for unknown catalog IDs and slugs', async () => {
    await request(app.getHttpServer())
      .get('/api/catalogs/00000000-0000-4000-8000-000000000000')
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/public/catalogs/unknown')
      .expect(404);
  });

  it('uses last-write-wins for sequential saves', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send({ slug: 'last-write-wins' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/catalogs/${created.body.id}/document`)
      .send({ sequence: 1 })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/catalogs/${created.body.id}/document`)
      .send({ sequence: 2 })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/catalogs/${created.body.id}`)
      .expect(200)
      .expect(({ body }) => expect(body.document).toEqual({ sequence: 2 }));
  });

  it('returns 413 when the JSON body exceeds 256kb', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send({ slug: 'body-limit' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/catalogs/${created.body.id}/document`)
      .send({ content: 'x'.repeat(270 * 1024) })
      .expect(413);
  });

  it('accepts a JSON body below the configured 256kb limit', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/catalogs')
      .send({ slug: 'body-below-limit' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/catalogs/${created.body.id}/document`)
      .send({ content: 'x'.repeat(200 * 1024) })
      .expect(200);
  });
});
