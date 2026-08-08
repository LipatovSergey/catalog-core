import { Value } from '@sinclair/typebox/value';
import { CatalogDocumentSchema } from '../../../../src/catalogs/document-validation/catalog-document.schema';
import { registerCatalogFormats } from '../../../../src/catalogs/document-validation/catalog-formats';

const validSectionId = 'd9428888-122b-4ff8-b234-cf471b0d1234';
const validItemId = '7b42981d-2928-4b24-93a1-84ca9b954342';

function validItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: validItemId,
    name: 'Coffee',
    price: '12.50',
    available: true,
    ...overrides,
  };
}

function validSection(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: validSectionId,
    title: 'Drinks',
    items: [],
    ...overrides,
  };
}

function validCatalogDocument(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    title: 'Summer Menu',
    currency: 'EUR',
    sections: [],
    ...overrides,
  };
}

function errorsFor(value: unknown) {
  return [...Value.Errors(CatalogDocumentSchema, value)];
}

function errorsForSection(overrides: Record<string, unknown> = {}) {
  return errorsFor(
    validCatalogDocument({ sections: [validSection(overrides)] }),
  );
}

function errorsForItem(overrides: Record<string, unknown> = {}) {
  return errorsForSection({ items: [validItem(overrides)] });
}

describe('CatalogDocumentSchema', () => {
  beforeAll(() => {
    registerCatalogFormats();
  });

  describe('catalog document', () => {
    it('accepts a minimal document', () => {
      expect(errorsFor(validCatalogDocument())).toEqual([]);
    });

    it('accepts a complete document', () => {
      expect(
        errorsFor(
          validCatalogDocument({
            description: 'Seasonal selection',
            sections: [
              validSection({
                description: 'Hot and cold drinks',
                items: [validItem({ description: 'Freshly brewed coffee' })],
              }),
            ],
          }),
        ),
      ).toEqual([]);
    });

    it.each(['schemaVersion', 'title', 'currency', 'sections'])(
      'rejects a document without the required %s property',
      (property) => {
        const document = validCatalogDocument();
        delete document[property];

        expect(errorsFor(document)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: `/${property}` }),
          ]),
        );
      },
    );

    it('rejects a schema version other than 1', () => {
      expect(errorsFor(validCatalogDocument({ schemaVersion: 2 }))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/schemaVersion' }),
        ]),
      );
    });

    it.each(['', 'x'.repeat(201)])(
      'rejects an invalid title length',
      (title) => {
        expect(errorsFor(validCatalogDocument({ title }))).toEqual(
          expect.arrayContaining([expect.objectContaining({ path: '/title' })]),
        );
      },
    );

    it.each(['', 'x'.repeat(2_001)])(
      'rejects an invalid description length',
      (description) => {
        expect(errorsFor(validCatalogDocument({ description }))).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/description' }),
          ]),
        );
      },
    );

    it.each(['eur', 'EU', 'EURO', 'E1R'])(
      'rejects the invalid currency code %s',
      (currency) => {
        expect(errorsFor(validCatalogDocument({ currency }))).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/currency' }),
          ]),
        );
      },
    );

    it('rejects sections that are not an array', () => {
      expect(
        errorsFor(validCatalogDocument({ sections: 'not-an-array' })),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections' }),
        ]),
      );
    });

    it('rejects more than 100 sections', () => {
      expect(
        errorsFor(
          validCatalogDocument({ sections: Array(101).fill(validSection()) }),
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections' }),
        ]),
      );
    });

    it('rejects unknown properties', () => {
      expect(errorsFor(validCatalogDocument({ unknown: true }))).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: '/unknown' })]),
      );
    });
  });

  describe('section', () => {
    it.each(['id', 'title', 'items'])(
      'rejects a section without the required %s property',
      (property) => {
        const section = validSection();
        delete section[property];

        expect(
          errorsFor(validCatalogDocument({ sections: [section] })),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: `/sections/0/${property}` }),
          ]),
        );
      },
    );

    it('rejects an invalid section UUID', () => {
      expect(errorsForSection({ id: 'not-a-uuid' })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/id' }),
        ]),
      );
    });

    it.each(['', 'x'.repeat(201)])(
      'rejects an invalid title length',
      (title) => {
        expect(errorsForSection({ title })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/sections/0/title' }),
          ]),
        );
      },
    );

    it.each(['', 'x'.repeat(2_001)])(
      'rejects an invalid description length',
      (description) => {
        expect(errorsForSection({ description })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/sections/0/description' }),
          ]),
        );
      },
    );

    it('rejects items that are not an array', () => {
      expect(errorsForSection({ items: 'not-an-array' })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items' }),
        ]),
      );
    });

    it('rejects more than 500 items', () => {
      expect(errorsForSection({ items: Array(501).fill(validItem()) })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items' }),
        ]),
      );
    });

    it('rejects unknown properties', () => {
      expect(errorsForSection({ unknown: true })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/unknown' }),
        ]),
      );
    });
  });

  describe('item', () => {
    it.each(['id', 'name', 'price', 'available'])(
      'rejects an item without the required %s property',
      (property) => {
        const item = validItem();
        delete item[property];

        expect(errorsForSection({ items: [item] })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: `/sections/0/items/0/${property}`,
            }),
          ]),
        );
      },
    );

    it('rejects an invalid item UUID', () => {
      expect(errorsForItem({ id: 'not-a-uuid' })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/id' }),
        ]),
      );
    });

    it.each(['', 'x'.repeat(201)])('rejects an invalid name length', (name) => {
      expect(errorsForItem({ name })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/name' }),
        ]),
      );
    });

    it.each(['0', '0.5', '0.50', '12', '12.3', '12.30'])(
      'accepts the valid price %s',
      (price) => {
        expect(errorsForItem({ price })).toEqual([]);
      },
    );

    it.each(['-1', '01.50', '1.', '.50', '1.234', '1,50', '1e3'])(
      'rejects the invalid price %s',
      (price) => {
        expect(errorsForItem({ price })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/sections/0/items/0/price' }),
          ]),
        );
      },
    );

    it('rejects a numeric price', () => {
      expect(errorsForItem({ price: 12.5 })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/price' }),
        ]),
      );
    });

    it('rejects a non-boolean availability value', () => {
      expect(errorsForItem({ available: 'true' })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/available' }),
        ]),
      );
    });

    it.each(['', 'x'.repeat(2_001)])(
      'rejects an invalid description length',
      (description) => {
        expect(errorsForItem({ description })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '/sections/0/items/0/description',
            }),
          ]),
        );
      },
    );

    it('rejects unknown properties', () => {
      expect(errorsForItem({ unknown: true })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/unknown' }),
        ]),
      );
    });
  });
});
