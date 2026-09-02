import { S3Client } from '@aws-sdk/client-s3';
import { type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequiredConfig } from '../config/environment';
import { ImageStorage } from './image-storage.abstract';
import { LocalImageStorageService } from './local-image-storage.service';
import { S3ImageStorageService } from './s3-image-storage.service';

export function createImageStorage(config: ConfigService): ImageStorage {
  const driver = getRequiredConfig(config, 'IMAGE_STORAGE_DRIVER');

  if (driver === 'local') {
    return new LocalImageStorageService(config);
  }

  if (driver !== 's3') {
    throw new Error('Unsupported image storage driver');
  }

  const accessKeyId = getOptionalConfig(config, 'S3_ACCESS_KEY_ID');
  const secretAccessKey = getOptionalConfig(config, 'S3_SECRET_ACCESS_KEY');
  const client = new S3Client({
    endpoint: getOptionalConfig(config, 'S3_ENDPOINT'),
    region: getRequiredConfig(config, 'S3_REGION'),
    forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
    credentials:
      accessKeyId !== undefined && secretAccessKey !== undefined
        ? { accessKeyId, secretAccessKey }
        : undefined,
  });

  return new S3ImageStorageService(
    client,
    getRequiredConfig(config, 'S3_BUCKET'),
  );
}

export const imageStorageProvider: Provider<ImageStorage> = {
  provide: ImageStorage,
  inject: [ConfigService],
  useFactory: createImageStorage,
};

function getOptionalConfig(
  config: ConfigService,
  key: string,
): string | undefined {
  const value = config.get<string>(key);
  return value === undefined || value.trim() === '' ? undefined : value;
}
