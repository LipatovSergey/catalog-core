import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CatalogEntity } from '../catalogs/catalog.entity';
import { getRequiredConfig } from '../config/environment';
import { createDatabaseSslOptions } from './database-ssl';

export function createTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: getRequiredConfig(config, 'DATABASE_HOST'),
    port: Number(getRequiredConfig(config, 'DATABASE_PORT')),
    username: getRequiredConfig(config, 'DATABASE_USER'),
    password: getRequiredConfig(config, 'DATABASE_PASSWORD'),
    database: getRequiredConfig(config, 'DATABASE_NAME'),
    ssl: createDatabaseSslOptions(
      config.get<string>('DATABASE_SSL'),
      config.get<string>('DATABASE_SSL_CA_PATH'),
    ),
    uuidExtension: 'pgcrypto',
    entities: [CatalogEntity],
    synchronize: false,
  };
}
