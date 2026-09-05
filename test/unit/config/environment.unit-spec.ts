import { validateEnvironment } from '../../../src/config/environment';

const databaseConfig = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '55432',
  DATABASE_USER: 'catalog',
  DATABASE_PASSWORD: 'catalog_local',
  DATABASE_NAME: 'catalog',
};

describe('validateEnvironment', () => {
  it('accepts S3 configuration', () => {
    const config = {
      ...databaseConfig,
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
    'requires %s',
    (key) => {
      const config: Record<string, unknown> = {
        ...databaseConfig,
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
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'catalog-images',
        S3_PUBLIC_BASE_URL: 'http://localhost:9000/catalog-images/',
        S3_FORCE_PATH_STYLE: 'yes',
      }),
    ).toThrow('S3_FORCE_PATH_STYLE must be either true or false');
  });
});
