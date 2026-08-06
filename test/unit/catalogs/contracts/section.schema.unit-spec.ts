import { Value } from '@sinclair/typebox/value';
import { SectionSchema } from '../../../../src/catalogs/contracts/section.schema';
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

function errorsFor(value: unknown) {
  return [...Value.Errors(SectionSchema, value)];
}

describe('SectionSchema', () => {
  let restoreUuidFormat: () => void;

  beforeAll(() => {
    restoreUuidFormat = installUuidFormat();
  });

  afterAll(() => {
    restoreUuidFormat();
  });

  it('accepts a valid section with no items or description', () => {
    expect(errorsFor(validSection())).toEqual([]);
  });

  it('accepts a valid section with items and a description', () => {
    expect(
      errorsFor(
        validSection({
          description: 'Hot and cold drinks',
          items: [validItem()],
        }),
      ),
    ).toEqual([]);
  });

  it.each(['id', 'title', 'items'])(
    'rejects a section without the required %s property',
    (property) => {
      const section = validSection() as Record<string, unknown>;
      delete section[property];

      expect(errorsFor(section)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: `/${property}` }),
        ]),
      );
    },
  );

  it('rejects an invalid section UUID', () => {
    expect(errorsFor(validSection({ id: 'not-a-uuid' }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/id' })]),
    );
  });

  it.each(['', 'x'.repeat(201)])('rejects an invalid title length', (title) => {
    expect(errorsFor(validSection({ title }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/title' })]),
    );
  });

  it.each(['', 'x'.repeat(2_001)])(
    'rejects an invalid description length',
    (description) => {
      expect(errorsFor(validSection({ description }))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/description' }),
        ]),
      );
    },
  );

  it('rejects items that are not an array', () => {
    expect(errorsFor(validSection({ items: 'not-an-array' }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/items' })]),
    );
  });

  it('rejects more than 500 items', () => {
    expect(
      errorsFor(validSection({ items: Array(501).fill(validItem()) })),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/items' })]),
    );
  });

  it('rejects unknown properties', () => {
    expect(errorsFor(validSection({ unknown: true }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/unknown' })]),
    );
  });

  it('reports a path to an invalid nested item', () => {
    expect(
      errorsFor(validSection({ items: [validItem({ price: '12.345' })] })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/items/0/price' }),
      ]),
    );
  });
});
