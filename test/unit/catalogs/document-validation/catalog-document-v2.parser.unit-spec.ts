import { parseCatalogDocumentV2 } from '../../../../src/catalogs/document-validation/catalog-document-v2.parser';
import { CatalogDocumentValidationError } from '../../../../src/catalogs/document-validation/catalog-document-validation.error';

function validCatalogDocument(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    defaultLocale: 'en',
    supportedLocales: ['en'],
    title: { en: 'Summer Menu' },
    currency: 'EUR',
    sections: [],
  };
}

describe('parseCatalogDocumentV2', () => {
  it('returns a valid catalog document without changing it', () => {
    const value = validCatalogDocument();

    expect(parseCatalogDocumentV2(value)).toBe(value);
  });

  it('uses the configured UUID format for nested identifiers', () => {
    const value = {
      ...validCatalogDocument(),
      sections: [
        {
          id: 'not-a-uuid',
          title: { en: 'Drinks' },
          items: [],
        },
      ],
    };

    expect(() => parseCatalogDocumentV2(value)).toThrow(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/id' }),
        ]),
      }),
    );
  });

  it('throws a catalog validation error with safe issue details', () => {
    const value = {
      ...validCatalogDocument(),
      schemaVersion: 3,
      currency: 'eur',
    };

    expect(() => parseCatalogDocumentV2(value)).toThrow(
      CatalogDocumentValidationError,
    );

    try {
      parseCatalogDocumentV2(value);
    } catch (error: unknown) {
      expect(error).toMatchObject({
        message: 'Catalog document is invalid',
        errors: expect.arrayContaining([
          expect.objectContaining({ path: '/schemaVersion' }),
          expect.objectContaining({ path: '/currency' }),
        ]),
      });
    }
  });

  it('rejects a document that violates business invariants', () => {
    expect(() =>
      parseCatalogDocumentV2({
        ...validCatalogDocument(),
        title: { en: '   ' },
      }),
    ).toThrow(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ path: '/title/en' }),
        ]),
      }),
    );
  });
});
