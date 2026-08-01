import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CatalogEntity } from '../catalogs/catalog.entity';
import { InitialCatalogs1720000000000 } from '../migrations/1720000000000-InitialCatalogs';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default new DataSource({
  type: 'postgres',
  host: required('DATABASE_HOST'),
  port: Number(required('DATABASE_PORT')),
  username: required('DATABASE_USER'),
  password: required('DATABASE_PASSWORD'),
  database: required('DATABASE_NAME'),
  uuidExtension: 'pgcrypto',
  entities: [CatalogEntity],
  migrations: [InitialCatalogs1720000000000],
  synchronize: false,
});
