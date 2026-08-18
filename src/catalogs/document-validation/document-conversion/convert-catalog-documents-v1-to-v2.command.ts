import { CatalogEntity } from '../../catalog.entity';
import dataSource from '../../../database/data-source';
import { type CatalogLocale } from '../catalog-document-v2.schema';
import {
  prepareCatalogDocumentsV2Conversion,
  type PreparedCatalogDocument,
} from './prepare-catalog-documents-v2-conversion';

export const catalogLocales = {
  '10000000-0000-4000-8000-000000000001': 'en',
  '10000000-0000-4000-8000-000000000002': 'cnr',
  '10000000-0000-4000-8000-000000000003': 'ru',
  '10000000-0000-4000-8000-000000000004': 'en',
  '10000000-0000-4000-8000-000000000005': 'cnr',
} satisfies Readonly<Record<string, CatalogLocale>>;

async function prepareCatalogs(): Promise<PreparedCatalogDocument[]> {
  const catalogs = await dataSource.getRepository(CatalogEntity).find({
    select: { id: true, document: true },
    order: { id: 'ASC' },
  });

  return prepareCatalogDocumentsV2Conversion(catalogs, catalogLocales);
}

export async function runCatalogDocumentsV1ToV2(write: boolean): Promise<void> {
  try {
    await dataSource.initialize();

    const preparedCatalogs = write
      ? await dataSource.transaction(async (manager) => {
          const catalogs = await manager.getRepository(CatalogEntity).find({
            select: { id: true, document: true },
            order: { id: 'ASC' },
          });
          const prepared = prepareCatalogDocumentsV2Conversion(
            catalogs,
            catalogLocales,
          );

          for (const catalog of prepared) {
            const result = await manager
              .getRepository(CatalogEntity)
              .update(catalog.id, { document: catalog.document });

            if (result.affected !== 1) {
              throw new Error(`Catalog ${catalog.id} was not updated`);
            }
          }

          return prepared;
        })
      : await prepareCatalogs();

    const action = write ? 'Converted' : 'Prepared';
    console.log(`${action} ${preparedCatalogs.length} catalog documents:`);
    for (const catalog of preparedCatalogs) {
      console.log(`${catalog.id}: ${catalog.document.defaultLocale}`);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

const write = process.argv.includes('--write');

void runCatalogDocumentsV1ToV2(write).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
