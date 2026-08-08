import { type CatalogDocument } from '../../../../src/catalogs/document-validation/catalog-document.schema';
import { validateCatalogDocumentInvariants } from '../../../../src/catalogs/document-validation/catalog-document-invariants';
import { CatalogDocumentValidationError } from '../../../../src/catalogs/document-validation/catalog-document-validation.error';

type Section = CatalogDocument['sections'][number];
type Item = Section['items'][number];

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
}

function validItem(id: string = uuid(2), overrides: Partial<Item> = {}): Item {
  return {
    id,
    name: 'Coffee',
    price: '12.50',
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
    title: 'Drinks',
    items: [],
    ...overrides,
  };
}

function validCatalogDocument(
  overrides: Partial<CatalogDocument> = {},
): CatalogDocument {
  return {
    schemaVersion: 1,
    title: 'Summer Menu',
    currency: 'EUR',
    sections: [],
    ...overrides,
  };
}

function validationErrorFor(
  document: CatalogDocument,
): CatalogDocumentValidationError {
  try {
    validateCatalogDocumentInvariants(document);
  } catch (error: unknown) {
    if (error instanceof CatalogDocumentValidationError) {
      return error;
    }
    throw error;
  }

  throw new Error('Expected catalog document validation to fail');
}

function expectIssue(document: CatalogDocument, path: string): void {
  expect(validationErrorFor(document).errors).toEqual(
    expect.arrayContaining([expect.objectContaining({ path })]),
  );
}

describe('validateCatalogDocumentInvariants', () => {
  it('accepts a document that satisfies all business invariants', () => {
    expect(() =>
      validateCatalogDocumentInvariants(
        validCatalogDocument({
          description: 'Seasonal selection',
          sections: [
            validSection(uuid(1), {
              description: 'Hot and cold drinks',
              items: [
                validItem(uuid(2), {
                  description: 'Freshly brewed coffee',
                }),
              ],
            }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects a whitespace-only catalog title', () => {
    expectIssue(validCatalogDocument({ title: '   ' }), '/title');
  });

  it('rejects a whitespace-only catalog description', () => {
    expectIssue(validCatalogDocument({ description: '\t\n' }), '/description');
  });

  it('rejects whitespace-only section strings', () => {
    const document = validCatalogDocument({
      sections: [validSection(uuid(1), { title: ' ', description: '\t' })],
    });

    expect(validationErrorFor(document).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/sections/0/title' }),
        expect.objectContaining({ path: '/sections/0/description' }),
      ]),
    );
  });

  it('rejects whitespace-only item strings', () => {
    const document = validCatalogDocument({
      sections: [
        validSection(uuid(1), {
          items: [validItem(uuid(2), { name: ' ', description: '\n' })],
        }),
      ],
    });

    expect(validationErrorFor(document).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/sections/0/items/0/name' }),
        expect.objectContaining({
          path: '/sections/0/items/0/description',
        }),
      ]),
    );
  });

  it('rejects a duplicate section ID', () => {
    const repeatedId = uuid(1);
    const document = validCatalogDocument({
      sections: [validSection(repeatedId), validSection(repeatedId)],
    });

    expectIssue(document, '/sections/1/id');
  });

  it('rejects a duplicate item ID across different sections', () => {
    const repeatedId = uuid(3);
    const document = validCatalogDocument({
      sections: [
        validSection(uuid(1), { items: [validItem(repeatedId)] }),
        validSection(uuid(2), { items: [validItem(repeatedId)] }),
      ],
    });

    expectIssue(document, '/sections/1/items/0/id');
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
