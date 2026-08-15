import { parseCatalogDocumentV1 } from '../../../../src/catalogs/document-validation/catalog-document-v1.parser';
import { parseCatalogDocumentV2 } from '../../../../src/catalogs/document-validation/catalog-document-v2.parser';
import { convertCatalogDocumentV1ToV2 } from '../../../../src/catalogs/document-validation/convert-catalog-document-v1-to-v2';

const catalogDocumentV1 = {
  schemaVersion: 1,
  title: 'Summer Menu',
  description: 'Seasonal food and drinks',
  currency: 'EUR',
  sections: [
    {
      id: 'd9428888-122b-4ff8-b234-cf471b0d1234',
      title: 'Drinks',
      description: 'Hot and cold drinks',
      items: [
        {
          id: '7b42981d-2928-4b24-93a1-84ca9b954342',
          name: 'Coffee',
          description: 'Freshly brewed coffee',
          price: '3.50',
          available: true,
        },
        {
          id: 'a1726f9e-6674-4c72-91ef-d3e9c10d8942',
          name: 'Tea',
          price: '2.50',
          available: true,
        },
      ],
    },
    {
      id: '10bdf995-03e9-4341-a36a-94009a77dc28',
      title: 'Desserts',
      items: [
        {
          id: '4ab92e5c-23b1-4474-8df5-abc986f8a774',
          name: 'Chocolate Cake',
          description: 'Served with vanilla ice cream',
          price: '6.00',
          available: false,
        },
      ],
    },
  ],
};

describe('migrateCatalogDocumentV1ToV2', () => {
  it('preserves all v1 data and converts it to the v2 structure', () => {
    const validatedV1 = parseCatalogDocumentV1(catalogDocumentV1);

    const migratedDocument = convertCatalogDocumentV1ToV2(validatedV1, 'en');

    expect(migratedDocument).toEqual({
      schemaVersion: 2,
      defaultLocale: 'en',
      supportedLocales: ['en'],
      title: { en: 'Summer Menu' },
      description: { en: 'Seasonal food and drinks' },
      currency: 'EUR',
      sections: [
        {
          id: 'd9428888-122b-4ff8-b234-cf471b0d1234',
          title: { en: 'Drinks' },
          description: { en: 'Hot and cold drinks' },
          items: [
            {
              id: '7b42981d-2928-4b24-93a1-84ca9b954342',
              name: { en: 'Coffee' },
              description: { en: 'Freshly brewed coffee' },
              priceVariants: [{ price: '3.50' }],
              available: true,
            },
            {
              id: 'a1726f9e-6674-4c72-91ef-d3e9c10d8942',
              name: { en: 'Tea' },
              priceVariants: [{ price: '2.50' }],
              available: true,
            },
          ],
        },
        {
          id: '10bdf995-03e9-4341-a36a-94009a77dc28',
          title: { en: 'Desserts' },
          items: [
            {
              id: '4ab92e5c-23b1-4474-8df5-abc986f8a774',
              name: { en: 'Chocolate Cake' },
              description: { en: 'Served with vanilla ice cream' },
              priceVariants: [{ price: '6.00' }],
              available: false,
            },
          ],
        },
      ],
    });
  });

  it('uses the explicitly provided locale for every migrated string', () => {
    const validatedV1 = parseCatalogDocumentV1(catalogDocumentV1);

    const migratedDocument = convertCatalogDocumentV1ToV2(validatedV1, 'cnr');

    expect(migratedDocument.defaultLocale).toBe('cnr');
    expect(migratedDocument.supportedLocales).toEqual(['cnr']);
    expect(migratedDocument.title).toEqual({ cnr: 'Summer Menu' });
    expect(migratedDocument.description).toEqual({
      cnr: 'Seasonal food and drinks',
    });
    expect(migratedDocument.sections[0]?.title).toEqual({ cnr: 'Drinks' });
    expect(migratedDocument.sections[0]?.items[0]?.name).toEqual({
      cnr: 'Coffee',
    });
  });

  it('omits optional descriptions that were absent in v1', () => {
    const validatedV1 = parseCatalogDocumentV1({
      schemaVersion: 1,
      title: 'Menu',
      currency: 'EUR',
      sections: [
        {
          id: 'd9428888-122b-4ff8-b234-cf471b0d1234',
          title: 'Drinks',
          items: [
            {
              id: '7b42981d-2928-4b24-93a1-84ca9b954342',
              name: 'Coffee',
              price: '3.50',
              available: true,
            },
          ],
        },
      ],
    });

    const migratedDocument = convertCatalogDocumentV1ToV2(validatedV1, 'en');

    expect(migratedDocument).not.toHaveProperty('description');
    expect(migratedDocument.sections[0]).not.toHaveProperty('description');
    expect(migratedDocument.sections[0]?.items[0]).not.toHaveProperty(
      'description',
    );
  });

  it('does not mutate the source document or reuse its nested structures', () => {
    const validatedV1 = parseCatalogDocumentV1(
      structuredClone(catalogDocumentV1),
    );
    const sourceBeforeMigration = structuredClone(validatedV1);

    const migratedDocument = convertCatalogDocumentV1ToV2(validatedV1, 'en');

    expect(validatedV1).toEqual(sourceBeforeMigration);
    expect(migratedDocument.sections).not.toBe(validatedV1.sections);
    expect(migratedDocument.sections[0]).not.toBe(validatedV1.sections[0]);
    expect(migratedDocument.sections[0]?.items).not.toBe(
      validatedV1.sections[0]?.items,
    );
    expect(migratedDocument.sections[0]?.items[0]).not.toBe(
      validatedV1.sections[0]?.items[0],
    );
  });

  it('returns a document accepted by the complete v2 parser', () => {
    const validatedV1 = parseCatalogDocumentV1(catalogDocumentV1);

    const migratedDocument = convertCatalogDocumentV1ToV2(validatedV1, 'ru');

    expect(parseCatalogDocumentV2(migratedDocument)).toBe(migratedDocument);
  });
});
