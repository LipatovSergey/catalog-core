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
  const validImageKey =
    '550e8400-e29b-41d4-a716-446655440000.webp';

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

  it('accepts an optional logical imageKey on an item', () => {
    const value = {
      ...validCatalogDocument(),
      sections: [
        {
          id: 'd9428888-122b-4ff8-b234-cf471b0d1234',
          title: { en: 'Drinks' },
          items: [
            {
              id: '7b42981d-2928-4b24-93a1-84ca9b954342',
              name: { en: 'Coffee' },
              imageKey: validImageKey,
              priceVariants: [{ price: '12.50' }],
              available: true,
            },
          ],
        },
      ],
    };

    expect(parseCatalogDocumentV2(value)).toBe(value);
  });

  it('rejects a physical image path on an item', () => {
    expect(() =>
      parseCatalogDocumentV2({
        ...validCatalogDocument(),
        sections: [
          {
            id: 'd9428888-122b-4ff8-b234-cf471b0d1234',
            title: { en: 'Drinks' },
            items: [
              {
                id: '7b42981d-2928-4b24-93a1-84ca9b954342',
                name: { en: 'Coffee' },
                imageKey: '/var/catalog/images/coffee.webp',
                priceVariants: [{ price: '12.50' }],
                available: true,
              },
            ],
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: '/sections/0/items/0/imageKey',
          }),
        ]),
      }),
    );
  });
});
