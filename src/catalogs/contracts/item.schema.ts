import {
  Type,
  type Static,
  type TBoolean,
  type TObject,
  type TOptional,
  type TString,
} from '@sinclair/typebox';

export const ItemSchema: TObject<{
  id: TString;
  name: TString;
  description: TOptional<TString>;
  price: TString;
  available: TBoolean;
}> = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    name: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(Type.String({ minLength: 1, maxLength: 2_000 })),
    price: Type.String({
      minLength: 1,
      maxLength: 13,
      pattern: '^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$',
    }),
    available: Type.Boolean(),
  },
  {
    additionalProperties: false,
  },
);

export type Item = Static<typeof ItemSchema>;
