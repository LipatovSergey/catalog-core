import { Value } from '@sinclair/typebox/value';
import { CatalogDocumentV2Schema } from '../../../../src/catalogs/document-validation/catalog-document-v2.schema';
import { registerCatalogFormats } from '../../../../src/catalogs/document-validation/catalog-formats';

const validSectionId = 'd9428888-122b-4ff8-b234-cf471b0d1234';
const validItemId = '7b42981d-2928-4b24-93a1-84ca9b954342';

function validPriceVariant(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    price: '12.50',
    ...overrides,
  };
}

function validItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: validItemId,
    name: { en: 'Coffee' },
    priceVariants: [validPriceVariant()],
    available: true,
    ...overrides,
  };
}

function validSection(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: validSectionId,
    title: { en: 'Drinks' },
    items: [],
    ...overrides,
  };
}

function validCatalogDocument(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 2,
    defaultLocale: 'en',
    supportedLocales: ['en'],
    title: { en: 'Summer Menu' },
    currency: 'EUR',
    sections: [],
    ...overrides,
  };
}

function errorsFor(value: unknown) {
  return [...Value.Errors(CatalogDocumentV2Schema, value)];
}

function errorsForSection(overrides: Record<string, unknown> = {}) {
  return errorsFor(
    validCatalogDocument({ sections: [validSection(overrides)] }),
  );
}

function errorsForItem(overrides: Record<string, unknown> = {}) {
  return errorsForSection({ items: [validItem(overrides)] });
}

function errorsForPriceVariant(overrides: Record<string, unknown> = {}) {
  return errorsForItem({ priceVariants: [validPriceVariant(overrides)] });
}

describe('CatalogDocumentV2Schema', () => {
  beforeAll(() => {
    registerCatalogFormats();
  });

  describe('catalog document', () => {
    it('accepts a minimal document', () => {
      expect(errorsFor(validCatalogDocument())).toEqual([]);
    });

    it('accepts a complete multilingual document', () => {
      expect(
        errorsFor(
          validCatalogDocument({
            defaultLocale: 'cnr',
            supportedLocales: ['cnr', 'en', 'ru'],
            title: {
              cnr: 'Ljetnji meni',
              en: 'Summer Menu',
              ru: 'Летнее меню',
            },
            description: {
              cnr: 'Sezonska ponuda',
              en: 'Seasonal selection',
            },
            sections: [
              validSection({
                title: { cnr: 'Pića', en: 'Drinks', ru: 'Напитки' },
                description: { en: 'Hot and cold drinks' },
                items: [
                  validItem({
                    name: { cnr: 'Kafa', en: 'Coffee', ru: 'Кофе' },
                    description: { en: 'Freshly brewed coffee' },
                    priceVariants: [
                      validPriceVariant({
                        label: { cnr: 'Mala', en: 'Small' },
                        price: '8',
                      }),
                      validPriceVariant({
                        label: { cnr: 'Velika', en: 'Large' },
                        price: '12',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ),
      ).toEqual([]);
    });

    it.each([
      'schemaVersion',
      'defaultLocale',
      'supportedLocales',
      'title',
      'currency',
      'sections',
    ])('rejects a document without the required %s property', (property) => {
      const document = validCatalogDocument();
      delete document[property];

      expect(errorsFor(document)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: `/${property}` }),
        ]),
      );
    });

    it('rejects a schema version other than 2', () => {
      expect(errorsFor(validCatalogDocument({ schemaVersion: 1 }))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/schemaVersion' }),
        ]),
      );
    });

    it.each(['de', 'EN', 'en-GB'])(
      'rejects unsupported locale %s',
      (locale) => {
        expect(
          errorsFor(validCatalogDocument({ defaultLocale: locale })),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/defaultLocale' }),
          ]),
        );
      },
    );

    it('rejects empty supportedLocales', () => {
      expect(errorsFor(validCatalogDocument({ supportedLocales: [] }))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/supportedLocales' }),
        ]),
      );
    });

    it('rejects duplicate supportedLocales', () => {
      expect(
        errorsFor(validCatalogDocument({ supportedLocales: ['en', 'en'] })),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/supportedLocales' }),
        ]),
      );
    });

    it('rejects more than three supportedLocales', () => {
      expect(
        errorsFor(
          validCatalogDocument({
            supportedLocales: ['cnr', 'en', 'ru', 'en'],
          }),
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/supportedLocales' }),
        ]),
      );
    });

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

  describe('localized text', () => {
    it('accepts each supported locale', () => {
      for (const locale of ['cnr', 'en', 'ru']) {
        expect(
          errorsFor(validCatalogDocument({ title: { [locale]: 'Menu' } })),
        ).toEqual([]);
      }
    });

    it('accepts a partial translation set', () => {
      expect(
        errorsFor(
          validCatalogDocument({
            supportedLocales: ['cnr', 'en', 'ru'],
            title: { cnr: 'Meni', en: 'Menu' },
          }),
        ),
      ).toEqual([]);
    });

    it('rejects an empty localized text', () => {
      expect(errorsFor(validCatalogDocument({ title: {} }))).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: '/title' })]),
      );
    });

    it.each(['de', 'EN', 'en-GB'])(
      'rejects the unsupported translation key %s',
      (locale) => {
        expect(
          errorsFor(
            validCatalogDocument({ title: { [locale]: 'Summer Menu' } }),
          ),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: `/title/${locale}` }),
          ]),
        );
      },
    );

    it.each(['', 'x'.repeat(201)])(
      'rejects an invalid title translation length',
      (title) => {
        expect(
          errorsFor(validCatalogDocument({ title: { en: title } })),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/title/en' }),
          ]),
        );
      },
    );

    it.each(['', 'x'.repeat(2_001)])(
      'rejects an invalid description translation length',
      (description) => {
        expect(
          errorsFor(validCatalogDocument({ description: { en: description } })),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '/description/en' }),
          ]),
        );
      },
    );

    it('rejects an empty optional description', () => {
      expect(errorsFor(validCatalogDocument({ description: {} }))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/description' }),
        ]),
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

    it('rejects an empty section title', () => {
      expect(errorsForSection({ title: {} })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/title' }),
        ]),
      );
    });

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
    const validImageKey =
      '550e8400-e29b-41d4-a716-446655440000.webp';

    it.each(['id', 'name', 'priceVariants', 'available'])(
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

    it('rejects an empty item name', () => {
      expect(errorsForItem({ name: {} })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/name' }),
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

    it('accepts an item without an imageKey', () => {
      expect(errorsForItem()).toEqual([]);
    });

    it('accepts a server-generated imageKey', () => {
      expect(errorsForItem({ imageKey: validImageKey })).toEqual([]);
    });

    it.each([
      'https://example.com/image.webp',
      '/var/catalog/images/image.webp',
      '../../image.webp',
      '550e8400-e29b-41d4-a716-446655440000.svg',
    ])('rejects the unsafe imageKey %s', (imageKey) => {
      expect(errorsForItem({ imageKey })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/imageKey' }),
        ]),
      );
    });

    it('rejects unknown properties', () => {
      expect(errorsForItem({ unknown: true })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/sections/0/items/0/unknown' }),
        ]),
      );
    });
  });

  describe('price variant', () => {
    it('accepts one variant without a label', () => {
      expect(errorsForItem()).toEqual([]);
    });

    it('accepts multiple localized variants', () => {
      expect(
        errorsForItem({
          priceVariants: [
            validPriceVariant({ label: { en: 'Small' }, price: '8' }),
            validPriceVariant({ label: { en: 'Large' }, price: '12' }),
          ],
        }),
      ).toEqual([]);
    });

    it('rejects an empty priceVariants array', () => {
      expect(errorsForItem({ priceVariants: [] })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/sections/0/items/0/priceVariants',
          }),
        ]),
      );
    });

    it('rejects more than 20 price variants', () => {
      expect(
        errorsForItem({
          priceVariants: Array(21).fill(validPriceVariant()),
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/sections/0/items/0/priceVariants',
          }),
        ]),
      );
    });

    it('rejects a variant without price', () => {
      const variant = validPriceVariant();
      delete variant.price;

      expect(errorsForItem({ priceVariants: [variant] })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/sections/0/items/0/priceVariants/0/price',
          }),
        ]),
      );
    });

    it.each(['0', '0.5', '0.50', '12', '12.3', '12.30'])(
      'accepts the valid price %s',
      (price) => {
        expect(errorsForPriceVariant({ price })).toEqual([]);
      },
    );

    it.each(['-1', '01.50', '1.', '.50', '1.234', '1,50', '1e3'])(
      'rejects the invalid price %s',
      (price) => {
        expect(errorsForPriceVariant({ price })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '/sections/0/items/0/priceVariants/0/price',
            }),
          ]),
        );
      },
    );

    it('rejects a numeric price', () => {
      expect(errorsForPriceVariant({ price: 12.5 })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/sections/0/items/0/priceVariants/0/price',
          }),
        ]),
      );
    });

    it.each(['', 'x'.repeat(201)])(
      'rejects an invalid label translation length',
      (label) => {
        expect(errorsForPriceVariant({ label: { en: label } })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '/sections/0/items/0/priceVariants/0/label/en',
            }),
          ]),
        );
      },
    );

    it('rejects an empty label', () => {
      expect(errorsForPriceVariant({ label: {} })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/sections/0/items/0/priceVariants/0/label',
          }),
        ]),
      );
    });

    it('rejects unknown properties', () => {
      expect(errorsForPriceVariant({ unknown: true })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/sections/0/items/0/priceVariants/0/unknown',
          }),
        ]),
      );
    });
  });
});
