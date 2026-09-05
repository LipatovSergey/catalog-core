import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
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
  s3?: {
    client: S3Client;
    bucket: string;
  };
  reset(): Promise<void>;
  close(): Promise<void>;
};

type CreateE2eTestContextOptions = {
  imageStorageDriver?: 'local' | 's3';
};

export async function createE2eTestContext(
  options: CreateE2eTestContextOptions = {},
): Promise<E2eTestContext> {
  config({ path: '.env.test', quiet: true });

  const imageStorageDriver = options.imageStorageDriver ?? 'local';
  const previousImageStorageDriver = process.env.IMAGE_STORAGE_DRIVER;
  const previousImageStorageDirectory = process.env.IMAGE_STORAGE_DIR;
  const previousS3Bucket = process.env.S3_BUCKET;
  const previousS3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const imageStorageDirectory = await mkdtemp(
    join(tmpdir(), 'catalog-core-images-e2e-'),
  );
  process.env.IMAGE_STORAGE_DRIVER = imageStorageDriver;
  process.env.IMAGE_STORAGE_DIR = imageStorageDirectory;

  const s3 =
    imageStorageDriver === 's3' ? await createS3TestStorage() : undefined;
  if (s3) {
    process.env.S3_BUCKET = s3.bucket;
    process.env.S3_PUBLIC_BASE_URL = `${requiredEnvironmentVariable('S3_ENDPOINT').replace(/\/$/, '')}/${s3.bucket}/`;
  }

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
    s3,
    async reset(): Promise<void> {
      await database.query('TRUNCATE TABLE "catalogs"');
      if (s3) {
        await emptyS3Bucket(s3.client, s3.bucket);
      } else {
        await rm(imageStorageDirectory, { recursive: true, force: true });
        await mkdir(imageStorageDirectory, { recursive: true });
      }
    },
    async close(): Promise<void> {
      await app.close();
      if (database.isInitialized) {
        await database.destroy();
      }
      await rm(imageStorageDirectory, { recursive: true, force: true });
      if (s3) {
        await emptyS3Bucket(s3.client, s3.bucket);
        await s3.client.send(new DeleteBucketCommand({ Bucket: s3.bucket }));
        s3.client.destroy();
      }
      restoreEnvironmentVariable(
        'IMAGE_STORAGE_DRIVER',
        previousImageStorageDriver,
      );
      restoreEnvironmentVariable(
        'IMAGE_STORAGE_DIR',
        previousImageStorageDirectory,
      );
      restoreEnvironmentVariable('S3_BUCKET', previousS3Bucket);
      restoreEnvironmentVariable('S3_PUBLIC_BASE_URL', previousS3PublicBaseUrl);
    },
  };
}

async function createS3TestStorage(): Promise<{
  client: S3Client;
  bucket: string;
}> {
  const client = new S3Client({
    endpoint: requiredEnvironmentVariable('S3_ENDPOINT'),
    region: requiredEnvironmentVariable('S3_REGION'),
    credentials: {
      accessKeyId: requiredEnvironmentVariable('S3_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnvironmentVariable('S3_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
  const bucket = `catalog-images-e2e-${randomUUID()}`;

  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      }),
    }),
  );

  return { client, bucket };
}

async function emptyS3Bucket(client: S3Client, bucket: string): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }),
    );
    const objects = listed.Contents?.flatMap(({ Key }) =>
      Key ? [{ Key }] : [],
    );

    if (objects?.length) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects },
        }),
      );
    }

    continuationToken = listed.NextContinuationToken;
  } while (continuationToken);
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for S3 e2e tests`);
  }
  return value;
}

function restoreEnvironmentVariable(
  name: string,
  previousValue: string | undefined,
): void {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}
