import { ConfigService } from '@nestjs/config';
import { createImageStorage } from '../../../src/images/image-storage.provider';
import { LocalImageStorageService } from '../../../src/images/local-image-storage.service';
import { S3ImageStorageService } from '../../../src/images/s3-image-storage.service';

describe('createImageStorage', () => {
  it('creates local storage for the local driver', () => {
    const storage = createImageStorage(
      new ConfigService({
        IMAGE_STORAGE_DRIVER: 'local',
        IMAGE_STORAGE_DIR: './var/catalog-images',
      }),
    );

    expect(storage).toBeInstanceOf(LocalImageStorageService);
  });

  it('creates S3 storage for the S3 driver', () => {
    const storage = createImageStorage(
      new ConfigService({
        IMAGE_STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'catalog-images',
        S3_ACCESS_KEY_ID: 'catalog',
        S3_SECRET_ACCESS_KEY: 'catalog_local_minio',
        S3_FORCE_PATH_STYLE: 'true',
      }),
    );

    expect(storage).toBeInstanceOf(S3ImageStorageService);
  });

  it('rejects an unsupported driver', () => {
    expect(() =>
      createImageStorage(
        new ConfigService({ IMAGE_STORAGE_DRIVER: 'unsupported' }),
      ),
    ).toThrow('Unsupported image storage driver');
  });
});
