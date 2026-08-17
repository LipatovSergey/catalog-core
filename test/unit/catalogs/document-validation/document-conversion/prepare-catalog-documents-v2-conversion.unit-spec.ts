import { CatalogDocumentValidationError } from '../../../../../src/catalogs/document-validation/catalog-document-validation.error';
import { prepareCatalogDocumentsV2Conversion } from '../../../../../src/catalogs/document-validation/document-conversion/prepare-catalog-documents-v2-conversion';

const firstCatalogId = 'a923c9be-ae79-42a9-83ed-341ac78c3026';
const secondCatalogId = 'e4515ad7-59cc-4725-8c8c-7f92286f65d4';

function catalogDocumentV1(title: string) {
  return {
    schemaVersion: 1,
    title,
    currency: 'EUR',
    sections: [],
  };
}

describe('prepareCatalogDocumentsV2Conversion', () => {
  it('converts multiple v1 catalogs using their assigned locales', () => {
    const catalogs = [
      { id: firstCatalogId, document: catalogDocumentV1('English Menu') },
      { id: secondCatalogId, document: catalogDocumentV1('Crnogorski meni') },
    ];
    const localeMapping = {
      [firstCatalogId]: 'en',
      [secondCatalogId]: 'cnr',
    } as const;

    const prepared = prepareCatalogDocumentsV2Conversion(
      catalogs,
      localeMapping,
    );

    expect(prepared).toEqual([
      {
        id: firstCatalogId,
        document: {
          schemaVersion: 2,
          defaultLocale: 'en',
          supportedLocales: ['en'],
          title: { en: 'English Menu' },
          currency: 'EUR',
          sections: [],
        },
      },
      {
        id: secondCatalogId,
        document: {
          schemaVersion: 2,
          defaultLocale: 'cnr',
          supportedLocales: ['cnr'],
          title: { cnr: 'Crnogorski meni' },
          currency: 'EUR',
          sections: [],
        },
      },
    ]);
  });

  it('preserves catalog row IDs and input order', () => {
    const catalogs = [
      { id: secondCatalogId, document: catalogDocumentV1('Second') },
      { id: firstCatalogId, document: catalogDocumentV1('First') },
    ];

    const prepared = prepareCatalogDocumentsV2Conversion(catalogs, {
      [firstCatalogId]: 'en',
      [secondCatalogId]: 'ru',
    });

    expect(prepared.map(({ id }) => id)).toEqual([
      secondCatalogId,
      firstCatalogId,
    ]);
  });

  it('rejects a catalog without an assigned locale and reports its ID', () => {
    const catalogs = [
      { id: firstCatalogId, document: catalogDocumentV1('Menu') },
    ];

    expect(() => prepareCatalogDocumentsV2Conversion(catalogs, {})).toThrow(
      `Locale was not set for ${firstCatalogId}`,
    );
  });

  it('rejects a corrupted v1 document', () => {
    const catalogs = [
      {
        id: firstCatalogId,
        document: { schemaVersion: 1, title: 'Broken document' },
      },
    ];

    expect(() =>
      prepareCatalogDocumentsV2Conversion(catalogs, {
        [firstCatalogId]: 'en',
      }),
    ).toThrow(CatalogDocumentValidationError);
  });

  it.each([
    ['v2', { schemaVersion: 2 }],
    ['an unknown version', { schemaVersion: 99 }],
  ])('rejects %s instead of treating it as v1', (_case, document) => {
    const catalogs = [{ id: firstCatalogId, document }];

    expect(() =>
      prepareCatalogDocumentsV2Conversion(catalogs, {
        [firstCatalogId]: 'en',
      }),
    ).toThrow(CatalogDocumentValidationError);
  });

  it('does not mutate source rows, documents, or locale mapping', () => {
    const catalogs = [
      { id: firstCatalogId, document: catalogDocumentV1('Menu') },
    ];
    const localeMapping = { [firstCatalogId]: 'ru' } as const;
    const catalogsBefore = structuredClone(catalogs);
    const localeMappingBefore = structuredClone(localeMapping);

    prepareCatalogDocumentsV2Conversion(catalogs, localeMapping);

    expect(catalogs).toEqual(catalogsBefore);
    expect(localeMapping).toEqual(localeMappingBefore);
  });
});
