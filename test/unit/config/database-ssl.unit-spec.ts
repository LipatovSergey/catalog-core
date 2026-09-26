import { readFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import { createDatabaseSslOptions } from '../../../src/database/database-ssl';
import { createTypeOrmOptions } from '../../../src/database/typeorm-options';

jest.mock('node:fs', () => ({
  ...jest.requireActual<typeof import('node:fs')>('node:fs'),
  readFileSync: jest.fn(),
}));

const readCa = jest.mocked(readFileSync);

describe('database SSL configuration', () => {
  beforeEach(() => {
    readCa.mockReset();
  });

  it.each([undefined, 'false'])('disables SSL for %s', (enabled) => {
    expect(createDatabaseSslOptions(enabled, undefined)).toBe(false);
    expect(readCa).not.toHaveBeenCalled();
  });

  it('loads the CA and requires certificate verification', () => {
    readCa.mockReturnValue('test CA');

    expect(createDatabaseSslOptions('true', '/certs/ca.pem')).toEqual({
      ca: 'test CA',
      rejectUnauthorized: true,
    });
    expect(readCa).toHaveBeenCalledWith('/certs/ca.pem', 'utf8');
  });

  it.each([undefined, '', ' '])(
    'requires a CA path when SSL is enabled: %s',
    (path) => {
      expect(() => createDatabaseSslOptions('true', path)).toThrow(
        'Missing required environment variable: DATABASE_SSL_CA_PATH',
      );
    },
  );

  it('rejects invalid SSL flags', () => {
    expect(() => createDatabaseSslOptions('yes', undefined)).toThrow(
      'DATABASE_SSL must be either true or false',
    );
  });

  it('propagates CA file read errors instead of disabling SSL', () => {
    readCa.mockImplementation(() => {
      throw new Error('CA file unavailable');
    });

    expect(() => createDatabaseSslOptions('true', '/missing/ca.pem')).toThrow(
      'CA file unavailable',
    );
  });

  it('includes SSL configuration in the Nest runtime connection options', () => {
    readCa.mockReturnValue('test CA');
    const config = new ConfigService({
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '5432',
      DATABASE_USER: 'catalog',
      DATABASE_PASSWORD: 'test',
      DATABASE_NAME: 'catalog',
      DATABASE_SSL: 'true',
      DATABASE_SSL_CA_PATH: '/certs/ca.pem',
    });

    expect(createTypeOrmOptions(config)).toEqual(
      expect.objectContaining({
        ssl: { ca: 'test CA', rejectUnauthorized: true },
      }),
    );
  });
});
