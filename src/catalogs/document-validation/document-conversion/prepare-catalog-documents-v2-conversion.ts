import { parseCatalogDocumentV1 } from '../catalog-document-v1.parser';
import {
  type CatalogLocale,
  type CatalogDocumentV2,
} from '../catalog-document-v2.schema';
import { convertCatalogDocumentV1ToV2 } from '../convert-catalog-document-v1-to-v2';

type StoredCatalog = {
  id: string;
  document: unknown;
};

type CatalogLocaleMapping = Readonly<Record<string, CatalogLocale>>;

export type PreparedCatalogDocument = {
  id: string;
  document: CatalogDocumentV2;
};

export function prepareCatalogDocumentsV2Conversion(
  catalogs: readonly StoredCatalog[],
  localeMapping: CatalogLocaleMapping,
): PreparedCatalogDocument[] {
  return catalogs.map((catalog) => {
    const locale = localeMapping[catalog.id];
    if (!locale) {
      throw new Error(`Locale was not set for ${catalog.id}`);
    }
    const parsedV1 = parseCatalogDocumentV1(catalog.document);
    const convertedDocument = convertCatalogDocumentV1ToV2(parsedV1, locale);
    return {
      id: catalog.id,
      document: convertedDocument,
    };
  });
}
