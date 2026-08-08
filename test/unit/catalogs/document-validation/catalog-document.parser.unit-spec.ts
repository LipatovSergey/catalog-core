import { CatalogDocumentValidationError } from '../../../../src/catalogs/document-validation/catalog-document-validation.error';
import { parseCatalogDocument } from '../../../../src/catalogs/document-validation/catalog-document.parser';

function validCatalogDocument(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    title: 'Summer Menu',
    currency: 'EUR',
    sections: [],
  };
}

describe('parseCatalogDocument', () => {
  it('returns a valid catalog document without changing it', () => {
    const value = validCatalogDocument();

    expect(parseCatalogDocument(value)).toBe(value);
  });

  it('uses the configured UUID format for nested identifiers', () => {
    const value = {
      ...validCatalogDocument(),
      sections: [
        {
          id: 'not-a-uuid',
          title: 'Drinks',
          items: [],
        },
      ],
    };

    expect(() => parseCatalogDocument(value)).toThrow(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/id' }),
        ]),
      }),
    );
  });

  it('throws a catalog validation error with safe issue details', () => {
    const value = {
      schemaVersion: 2,
      title: 'Summer Menu',
      currency: 'eur',
      sections: [],
    };

    expect(() => parseCatalogDocument(value)).toThrow(
      CatalogDocumentValidationError,
    );

    try {
      parseCatalogDocument(value);
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
      parseCatalogDocument({
        ...validCatalogDocument(),
        title: '   ',
      }),
    ).toThrow(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ path: '/title' }),
        ]),
      }),
    );
  });
});
