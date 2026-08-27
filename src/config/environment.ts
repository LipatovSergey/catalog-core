import { ConfigService } from '@nestjs/config';

const requiredVariables = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'IMAGE_STORAGE_DIR',
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

  return config;
}

export function getRequiredConfig(config: ConfigService, key: string): string {
  return config.getOrThrow<string>(key);
}
