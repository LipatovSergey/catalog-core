import { Value } from '@sinclair/typebox/value';
import { CatalogDocumentSchema } from '../../../../src/catalogs/contracts/catalog-document.schema';
import { installUuidFormat } from './typebox-formats.helper';

const validSectionId = 'd9428888-122b-4ff8-b234-cf471b0d1234';
const validItemId = '7b42981d-2928-4b24-93a1-84ca9b954342';

function validItem(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: validItemId,
    name: 'Coffee',
    price: '12.50',
    available: true,
    ...overrides,
  };
}

function validSection(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: validSectionId,
    title: 'Drinks',
    items: [],
    ...overrides,
  };
}

function validCatalogDocument(
  overrides: Record<string, unknown> = {},
): unknown {
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

describe('CatalogDocumentSchema', () => {
  let restoreUuidFormat: () => void;

  beforeAll(() => {
    restoreUuidFormat = installUuidFormat();
  });

  afterAll(() => {
    restoreUuidFormat();
  });

  it('accepts a minimal catalog document', () => {
    expect(errorsFor(validCatalogDocument())).toEqual([]);
  });

  it('accepts a catalog document with sections and a description', () => {
    expect(
      errorsFor(
        validCatalogDocument({
          description: 'Seasonal selection',
          sections: [validSection({ items: [validItem()] })],
        }),
      ),
    ).toEqual([]);
  });

  it.each(['schemaVersion', 'title', 'currency', 'sections'])(
    'rejects a catalog document without the required %s property',
    (property) => {
      const document = validCatalogDocument() as Record<string, unknown>;
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

  it.each(['', 'x'.repeat(201)])('rejects an invalid title length', (title) => {
    expect(errorsFor(validCatalogDocument({ title }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/title' })]),
    );
  });

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
      expect.arrayContaining([expect.objectContaining({ path: '/sections' })]),
    );
  });

  it('rejects more than 100 sections', () => {
    expect(
      errorsFor(
        validCatalogDocument({ sections: Array(101).fill(validSection()) }),
      ),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/sections' })]),
    );
  });

  it('rejects unknown properties', () => {
    expect(errorsFor(validCatalogDocument({ unknown: true }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/unknown' })]),
    );
  });

  it('reports a path to an invalid nested item', () => {
    expect(
      errorsFor(
        validCatalogDocument({
          sections: [validSection({ items: [validItem({ price: '12.345' })] })],
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/sections/0/items/0/price' }),
      ]),
    );
  });
});
