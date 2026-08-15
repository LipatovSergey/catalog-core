import { validateCatalogDocumentV2Invariants } from '../../../../src/catalogs/document-validation/catalog-document-v2-invariants';
import { CatalogDocumentValidationError } from '../../../../src/catalogs/document-validation/catalog-document-validation.error';
import { type CatalogDocumentV2 } from '../../../../src/catalogs/document-validation/catalog-document-v2.schema';

type Section = CatalogDocumentV2['sections'][number];
type Item = Section['items'][number];
type PriceVariant = Item['priceVariants'][number];

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
}

function validPriceVariant(
  overrides: Partial<PriceVariant> = {},
): PriceVariant {
  return {
    price: '12.50',
    ...overrides,
  };
}

function validItem(id: string = uuid(2), overrides: Partial<Item> = {}): Item {
  return {
    id,
    name: { en: 'Coffee' },
    priceVariants: [validPriceVariant()],
    available: true,
    ...overrides,
  };
}

function validSection(
  id: string = uuid(1),
  overrides: Partial<Section> = {},
): Section {
  return {
    id,
    title: { en: 'Drinks' },
    items: [],
    ...overrides,
  };
}

function validCatalogDocument(
  overrides: Partial<CatalogDocumentV2> = {},
): CatalogDocumentV2 {
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

function validationErrorFor(
  document: CatalogDocumentV2,
): CatalogDocumentValidationError {
  try {
    validateCatalogDocumentV2Invariants(document);
  } catch (error: unknown) {
    if (error instanceof CatalogDocumentValidationError) {
      return error;
    }
    throw error;
  }

  throw new Error('Expected catalog document validation to fail');
}

function expectIssue(document: CatalogDocumentV2, path: string): void {
  expect(validationErrorFor(document).errors).toEqual(
    expect.arrayContaining([expect.objectContaining({ path })]),
  );
}

describe('validateCatalogDocumentV2Invariants', () => {
  it('accepts a document that satisfies all business invariants', () => {
    expect(() =>
      validateCatalogDocumentV2Invariants(
        validCatalogDocument({
          defaultLocale: 'cnr',
          supportedLocales: ['cnr', 'en', 'ru'],
          title: { cnr: 'Meni', en: 'Menu' },
          description: { en: 'Seasonal selection' },
          sections: [
            validSection(uuid(1), {
              title: { cnr: 'Pića', en: 'Drinks' },
              description: { ru: 'Напитки' },
              items: [
                validItem(uuid(2), {
                  name: { cnr: 'Kafa', en: 'Coffee' },
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
    ).not.toThrow();
  });

  it('rejects a default locale outside supportedLocales', () => {
    expectIssue(
      validCatalogDocument({
        defaultLocale: 'cnr',
        supportedLocales: ['en'],
        title: { cnr: 'Meni' },
      }),
      '/defaultLocale',
    );
  });

  it('rejects translation locales outside supportedLocales', () => {
    const document = validCatalogDocument({
      supportedLocales: ['en'],
      title: { en: 'Menu', ru: 'Меню' },
      description: { cnr: 'Meni' },
      sections: [
        validSection(uuid(1), {
          title: { en: 'Drinks', ru: 'Напитки' },
          description: { cnr: 'Pića' },
          items: [
            validItem(uuid(2), {
              name: { en: 'Coffee', ru: 'Кофе' },
              description: { cnr: 'Kafa' },
              priceVariants: [
                validPriceVariant({ label: { en: 'Cup', ru: 'Чашка' } }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(validationErrorFor(document).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/title/ru' }),
        expect.objectContaining({ path: '/description/cnr' }),
        expect.objectContaining({ path: '/sections/0/title/ru' }),
        expect.objectContaining({ path: '/sections/0/description/cnr' }),
        expect.objectContaining({ path: '/sections/0/items/0/name/ru' }),
        expect.objectContaining({
          path: '/sections/0/items/0/description/cnr',
        }),
        expect.objectContaining({
          path: '/sections/0/items/0/priceVariants/0/label/ru',
        }),
      ]),
    );
  });

  it('requires the default locale in catalog and section titles and item names', () => {
    const document = validCatalogDocument({
      defaultLocale: 'cnr',
      supportedLocales: ['cnr', 'en'],
      title: { en: 'Menu' },
      sections: [
        validSection(uuid(1), {
          title: { en: 'Drinks' },
          items: [validItem(uuid(2), { name: { en: 'Coffee' } })],
        }),
      ],
    });

    expect(validationErrorFor(document).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/title/cnr' }),
        expect.objectContaining({ path: '/sections/0/title/cnr' }),
        expect.objectContaining({ path: '/sections/0/items/0/name/cnr' }),
      ]),
    );
  });

  it('allows an optional description without the default locale', () => {
    expect(() =>
      validateCatalogDocumentV2Invariants(
        validCatalogDocument({
          defaultLocale: 'cnr',
          supportedLocales: ['cnr', 'en'],
          title: { cnr: 'Meni' },
          description: { en: 'Seasonal selection' },
          sections: [
            validSection(uuid(1), {
              title: { cnr: 'Pića' },
              description: { en: 'Drinks' },
              items: [
                validItem(uuid(2), {
                  name: { cnr: 'Kafa' },
                  description: { en: 'Coffee' },
                }),
              ],
            }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects whitespace-only translations at every localized level', () => {
    const document = validCatalogDocument({
      title: { en: ' ' },
      description: { en: '\t' },
      sections: [
        validSection(uuid(1), {
          title: { en: '\n' },
          description: { en: '  ' },
          items: [
            validItem(uuid(2), {
              name: { en: '\t\n' },
              description: { en: ' ' },
              priceVariants: [
                validPriceVariant({ label: { en: '\n' } }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(validationErrorFor(document).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/title/en' }),
        expect.objectContaining({ path: '/description/en' }),
        expect.objectContaining({ path: '/sections/0/title/en' }),
        expect.objectContaining({ path: '/sections/0/description/en' }),
        expect.objectContaining({ path: '/sections/0/items/0/name/en' }),
        expect.objectContaining({ path: '/sections/0/items/0/description/en' }),
        expect.objectContaining({
          path: '/sections/0/items/0/priceVariants/0/label/en',
        }),
      ]),
    );
  });

  it('allows a single price variant without a label', () => {
    expect(() =>
      validateCatalogDocumentV2Invariants(
        validCatalogDocument({
          sections: [
            validSection(uuid(1), { items: [validItem(uuid(2))] }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('requires labels for multiple price variants', () => {
    const document = validCatalogDocument({
      sections: [
        validSection(uuid(1), {
          items: [
            validItem(uuid(2), {
              priceVariants: [
                validPriceVariant({ label: { en: 'Small' }, price: '8' }),
                validPriceVariant({ price: '12' }),
              ],
            }),
          ],
        }),
      ],
    });

    expectIssue(
      document,
      '/sections/0/items/0/priceVariants/1/label',
    );
  });

  it('requires the default locale in labels for multiple price variants', () => {
    const document = validCatalogDocument({
      defaultLocale: 'cnr',
      supportedLocales: ['cnr', 'en'],
      title: { cnr: 'Meni' },
      sections: [
        validSection(uuid(1), {
          title: { cnr: 'Pića' },
          items: [
            validItem(uuid(2), {
              name: { cnr: 'Kafa' },
              priceVariants: [
                validPriceVariant({ label: { cnr: 'Mala' }, price: '8' }),
                validPriceVariant({ label: { en: 'Large' }, price: '12' }),
              ],
            }),
          ],
        }),
      ],
    });

    expectIssue(
      document,
      '/sections/0/items/0/priceVariants/1/label/cnr',
    );
  });

  it('rejects duplicate default-locale labels within an item', () => {
    const document = validCatalogDocument({
      sections: [
        validSection(uuid(1), {
          items: [
            validItem(uuid(2), {
              priceVariants: [
                validPriceVariant({ label: { en: 'Cup' }, price: '8' }),
                validPriceVariant({ label: { en: 'Cup' }, price: '12' }),
              ],
            }),
          ],
        }),
      ],
    });

    expectIssue(
      document,
      '/sections/0/items/0/priceVariants/1/label/en',
    );
  });

  it('allows different variants to have the same price', () => {
    expect(() =>
      validateCatalogDocumentV2Invariants(
        validCatalogDocument({
          sections: [
            validSection(uuid(1), {
              items: [
                validItem(uuid(2), {
                  priceVariants: [
                    validPriceVariant({ label: { en: 'Hot' }, price: '8' }),
                    validPriceVariant({ label: { en: 'Iced' }, price: '8' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects a duplicate section ID', () => {
    const repeatedId = uuid(1);

    expectIssue(
      validCatalogDocument({
        sections: [validSection(repeatedId), validSection(repeatedId)],
      }),
      '/sections/1/id',
    );
  });

  it('rejects a duplicate item ID across different sections', () => {
    const repeatedId = uuid(3);

    expectIssue(
      validCatalogDocument({
        sections: [
          validSection(uuid(1), { items: [validItem(repeatedId)] }),
          validSection(uuid(2), { items: [validItem(repeatedId)] }),
        ],
      }),
      '/sections/1/items/0/id',
    );
  });

  it('rejects more than 5000 items across the catalog', () => {
    const items = Array.from({ length: 5_001 }, (_, index) =>
      validItem(uuid(index + 100)),
    );
    const sections = Array.from({ length: 11 }, (_, index) =>
      validSection(uuid(index + 1), {
        items: items.slice(index * 500, (index + 1) * 500),
      }),
    );

    expectIssue(validCatalogDocument({ sections }), '/sections');
  });
});
