import { readFileSync } from 'node:fs';

export function createDatabaseSslOptions(
  enabled: string | undefined,
  caPath: string | undefined,
): false | { ca: string; rejectUnauthorized: true } {
  if (enabled !== undefined && enabled !== 'true' && enabled !== 'false') {
    throw new Error('DATABASE_SSL must be either true or false');
  }

  if (enabled !== 'true') {
    return false;
  }

  if (!caPath || caPath.trim() === '') {
    throw new Error(
      'Missing required environment variable: DATABASE_SSL_CA_PATH',
    );
  }

  return {
    ca: readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
  };
}
