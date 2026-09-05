import { ConfigService } from '@nestjs/config';

const requiredVariables = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'S3_REGION',
  'S3_BUCKET',
  'S3_PUBLIC_BASE_URL',
] as const;

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const variable of requiredVariables) {
    const value = config[variable];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variable}`);
    }
  }

  const databasePort = Number(config.DATABASE_PORT);
  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65535
  ) {
    throw new Error('DATABASE_PORT must be a valid TCP port');
  }

  const accessKeyId = config.S3_ACCESS_KEY_ID;
  const secretAccessKey = config.S3_SECRET_ACCESS_KEY;
  if (
    (hasNonEmptyString(accessKeyId) && !hasNonEmptyString(secretAccessKey)) ||
    (!hasNonEmptyString(accessKeyId) && hasNonEmptyString(secretAccessKey))
  ) {
    throw new Error(
      'S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be provided together',
    );
  }

  const forcePathStyle = config.S3_FORCE_PATH_STYLE;
  if (
    forcePathStyle !== undefined &&
    forcePathStyle !== 'true' &&
    forcePathStyle !== 'false'
  ) {
    throw new Error('S3_FORCE_PATH_STYLE must be either true or false');
  }

  return config;
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export function getRequiredConfig(config: ConfigService, key: string): string {
  return config.getOrThrow<string>(key);
}
