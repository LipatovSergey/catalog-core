import { Value } from '@sinclair/typebox/value';
import { ItemSchema } from '../../../../src/catalogs/contracts/item.schema';
import { installUuidFormat } from './typebox-formats.helper';

const validUuid = '7b42981d-2928-4b24-93a1-84ca9b954342';

function validItem(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: validUuid,
    name: 'Coffee',
    price: '12.50',
    available: true,
    ...overrides,
  };
}

function errorsFor(value: unknown) {
  return [...Value.Errors(ItemSchema, value)];
}

describe('ItemSchema', () => {
  let restoreUuidFormat: () => void;

  beforeAll(() => {
    restoreUuidFormat = installUuidFormat();
  });

  afterAll(() => {
    restoreUuidFormat();
  });

  it('accepts a valid item without an optional description', () => {
    expect(errorsFor(validItem())).toEqual([]);
  });

  it('accepts a valid item with a description', () => {
    expect(
      errorsFor(validItem({ description: 'Freshly brewed coffee' })),
    ).toEqual([]);
  });

  it.each(['id', 'name', 'price', 'available'])(
    'rejects an item without the required %s property',
    (property) => {
      const item = validItem() as Record<string, unknown>;
      delete item[property];

      expect(errorsFor(item)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: `/${property}` }),
        ]),
      );
    },
  );

  it('rejects an invalid UUID', () => {
    expect(errorsFor(validItem({ id: 'not-a-uuid' }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/id' })]),
    );
  });

  it.each(['', 'x'.repeat(201)])('rejects an invalid name length', (name) => {
    expect(errorsFor(validItem({ name }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/name' })]),
    );
  });

  it.each(['0', '0.5', '0.50', '12', '12.3', '12.30'])(
    'accepts the valid price %s',
    (price) => {
      expect(errorsFor(validItem({ price }))).toEqual([]);
    },
  );

  it.each(['-1', '01.50', '1.', '.50', '1.234', '1,50', '1e3'])(
    'rejects the invalid price %s',
    (price) => {
      expect(errorsFor(validItem({ price }))).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: '/price' })]),
      );
    },
  );

  it('rejects a numeric price', () => {
    expect(errorsFor(validItem({ price: 12.5 }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/price' })]),
    );
  });

  it('rejects a non-boolean availability value', () => {
    expect(errorsFor(validItem({ available: 'true' }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/available' })]),
    );
  });

  it.each(['', 'x'.repeat(2_001)])(
    'rejects an invalid description length',
    (description) => {
      expect(errorsFor(validItem({ description }))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/description' }),
        ]),
      );
    },
  );

  it('rejects unknown properties', () => {
    expect(errorsFor(validItem({ unknown: true }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/unknown' })]),
    );
  });
});
