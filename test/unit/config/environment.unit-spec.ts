import { validateEnvironment } from '../../../src/config/environment';

const databaseConfig = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '55432',
  DATABASE_USER: 'catalog',
  DATABASE_PASSWORD: 'catalog_local',
  DATABASE_NAME: 'catalog',
};

describe('validateEnvironment', () => {
  it('accepts local image storage configuration', () => {
    const config = {
      ...databaseConfig,
      IMAGE_STORAGE_DRIVER: 'local',
      IMAGE_STORAGE_DIR: './var/catalog-images',
    };

    expect(validateEnvironment(config)).toBe(config);
  });

  it('requires a local directory only for the local driver', () => {
    expect(() =>
      validateEnvironment({
        ...databaseConfig,
        IMAGE_STORAGE_DRIVER: 'local',
      }),
    ).toThrow('Missing required environment variable: IMAGE_STORAGE_DIR');
  });

  it('accepts S3 configuration without local storage configuration', () => {
    const config = {
      ...databaseConfig,
      IMAGE_STORAGE_DRIVER: 's3',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'catalog-images',
      S3_PUBLIC_BASE_URL: 'http://localhost:9000/catalog-images/',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY_ID: 'catalog',
      S3_SECRET_ACCESS_KEY: 'catalog_local_minio',
      S3_FORCE_PATH_STYLE: 'true',
    };

    expect(validateEnvironment(config)).toBe(config);
  });

  it.each(['S3_REGION', 'S3_BUCKET', 'S3_PUBLIC_BASE_URL'])(
    'requires %s for the S3 driver',
    (key) => {
      const config: Record<string, unknown> = {
        ...databaseConfig,
        IMAGE_STORAGE_DRIVER: 's3',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'catalog-images',
        S3_PUBLIC_BASE_URL: 'http://localhost:9000/catalog-images/',
      };
      delete config[key];

      expect(() => validateEnvironment(config)).toThrow(
        `Missing required environment variable: ${key}`,
      );
    },
  );

  it('requires S3 credentials to be provided together', () => {
    expect(() =>
      validateEnvironment({
        ...databaseConfig,
        IMAGE_STORAGE_DRIVER: 's3',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'catalog-images',
        S3_PUBLIC_BASE_URL: 'http://localhost:9000/catalog-images/',
        S3_ACCESS_KEY_ID: 'catalog',
      }),
    ).toThrow(
      'S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be provided together',
    );
  });

  it('rejects an invalid force-path-style value', () => {
    expect(() =>
      validateEnvironment({
        ...databaseConfig,
        IMAGE_STORAGE_DRIVER: 's3',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'catalog-images',
        S3_PUBLIC_BASE_URL: 'http://localhost:9000/catalog-images/',
        S3_FORCE_PATH_STYLE: 'yes',
      }),
    ).toThrow('S3_FORCE_PATH_STYLE must be either true or false');
  });

  it('rejects an unknown image storage driver', () => {
    expect(() =>
      validateEnvironment({
        ...databaseConfig,
        IMAGE_STORAGE_DRIVER: 'filesystem',
      }),
    ).toThrow('IMAGE_STORAGE_DRIVER must be either local or s3');
  });
});
