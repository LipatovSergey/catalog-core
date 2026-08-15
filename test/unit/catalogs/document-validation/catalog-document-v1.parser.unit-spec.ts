import { CatalogDocumentValidationError } from '../../../../src/catalogs/document-validation/catalog-document-validation.error';
import { parseCatalogDocumentV1 } from '../../../../src/catalogs/document-validation/catalog-document-v1.parser';

function validCatalogDocumentV1(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    title: 'Summer Menu',
    currency: 'EUR',
    sections: [],
  };
}

describe('parseCatalogDocumentV1', () => {
  it('returns a valid catalog document without changing it', () => {
    const value = validCatalogDocumentV1();

    expect(parseCatalogDocumentV1(value)).toBe(value);
  });

  it('uses the configured UUID format for nested identifiers', () => {
    const value = {
      ...validCatalogDocumentV1(),
      sections: [
        {
          id: 'not-a-uuid',
          title: 'Drinks',
          items: [],
        },
      ],
    };

    expect(() => parseCatalogDocumentV1(value)).toThrow(
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

    expect(() => parseCatalogDocumentV1(value)).toThrow(
      CatalogDocumentValidationError,
    );

    try {
      parseCatalogDocumentV1(value);
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
      parseCatalogDocumentV1({
        ...validCatalogDocumentV1(),
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
