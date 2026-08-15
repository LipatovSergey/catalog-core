import {
  Type,
  type Static,
  type TArray,
  type TBoolean,
  type TLiteral,
  type TObject,
  type TOptional,
  type TString,
} from '@sinclair/typebox';

const ItemSchema: TObject<{
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
  { additionalProperties: false },
);

const SectionSchema: TObject<{
  id: TString;
  title: TString;
  description: TOptional<TString>;
  items: TArray<typeof ItemSchema>;
}> = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    title: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(Type.String({ minLength: 1, maxLength: 2_000 })),
    items: Type.Array(ItemSchema, { maxItems: 500 }),
  },
  { additionalProperties: false },
);

export const CatalogDocumentV1Schema: TObject<{
  schemaVersion: TLiteral<1>;
  title: TString;
  description: TOptional<TString>;
  currency: TString;
  sections: TArray<typeof SectionSchema>;
}> = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    title: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(Type.String({ minLength: 1, maxLength: 2_000 })),
    currency: Type.String({ pattern: '^[A-Z]{3}$' }),
    sections: Type.Array(SectionSchema, { maxItems: 100 }),
  },
  { additionalProperties: false },
);

export type CatalogDocumentV1 = Static<typeof CatalogDocumentV1Schema>;
