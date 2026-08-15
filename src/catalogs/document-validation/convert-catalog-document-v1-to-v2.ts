import { type CatalogDocumentV1 } from './catalog-document-v1.schema';
import { parseCatalogDocumentV2 } from './catalog-document-v2.parser';
import { CatalogDocumentV2, CatalogLocale } from './catalog-document-v2.schema';

export function convertCatalogDocumentV1ToV2(
  document: CatalogDocumentV1,
  defaultLocale: CatalogLocale,
): CatalogDocumentV2 {
  const documentV2: CatalogDocumentV2 = {
    schemaVersion: 2,
    defaultLocale: defaultLocale,
    supportedLocales: [defaultLocale],
    title: {
      [defaultLocale]: document.title,
    },
    ...(document.description === undefined
      ? {}
      : { description: { [defaultLocale]: document.description } }),
    currency: document.currency,
    sections: document.sections.map((section) => ({
      id: section.id,
      title: {
        [defaultLocale]: section.title,
      },
      ...(section.description === undefined
        ? {}
        : { description: { [defaultLocale]: section.description } }),
      items: section.items.map((item) => ({
        id: item.id,
        name: { [defaultLocale]: item.name },
        priceVariants: [{ price: item.price }],
        available: item.available,
        ...(item.description === undefined
          ? {}
          : { description: { [defaultLocale]: item.description } }),
      })),
    })),
  };
  return parseCatalogDocumentV2(documentV2);
}
