import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { configureApp } from '../../../src/configure-app';
import { InitialCatalogs1720000000000 } from '../../../src/migrations/1720000000000-InitialCatalogs';
import { RemoveCatalogSlug1720000000001 } from '../../../src/migrations/1720000000001-RemoveCatalogSlug';

export type E2eTestContext = {
  app: INestApplication;
  database: DataSource;
  imageStorageDirectory: string;
  reset(): Promise<void>;
  close(): Promise<void>;
};

export async function createE2eTestContext(): Promise<E2eTestContext> {
  const previousImageStorageDirectory = process.env.IMAGE_STORAGE_DIR;
  const imageStorageDirectory = await mkdtemp(
    join(tmpdir(), 'catalog-core-images-e2e-'),
  );
  process.env.IMAGE_STORAGE_DIR = imageStorageDirectory;

  const { AppModule } = await import('../../../src/app.module');
  const database = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    uuidExtension: 'pgcrypto',
    migrations: [InitialCatalogs1720000000000, RemoveCatalogSlug1720000000001],
    synchronize: false,
  });
  await database.initialize();
  await database.runMigrations();

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();

  return {
    app,
    database,
    imageStorageDirectory,
    async reset(): Promise<void> {
      await database.query('TRUNCATE TABLE "catalogs"');
      await rm(imageStorageDirectory, { recursive: true, force: true });
      await mkdir(imageStorageDirectory, { recursive: true });
    },
    async close(): Promise<void> {
      await app.close();
      if (database.isInitialized) {
        await database.destroy();
      }
      await rm(imageStorageDirectory, { recursive: true, force: true });
      if (previousImageStorageDirectory === undefined) {
        delete process.env.IMAGE_STORAGE_DIR;
      } else {
        process.env.IMAGE_STORAGE_DIR = previousImageStorageDirectory;
      }
    },
  };
}
