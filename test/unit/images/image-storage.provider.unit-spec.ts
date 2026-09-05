import { ConfigService } from '@nestjs/config';
import { createImageStorage } from '../../../src/images/image-storage.provider';
import { S3ImageStorageService } from '../../../src/images/s3-image-storage.service';

describe('createImageStorage', () => {
  it('creates S3 storage', () => {
    const storage = createImageStorage(
      new ConfigService({
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'catalog-images',
        S3_PUBLIC_BASE_URL: 'http://localhost:9000/catalog-images/',
        S3_ACCESS_KEY_ID: 'catalog',
        S3_SECRET_ACCESS_KEY: 'catalog_local_minio',
        S3_FORCE_PATH_STYLE: 'true',
      }),
    );

    expect(storage).toBeInstanceOf(S3ImageStorageService);
  });
});
