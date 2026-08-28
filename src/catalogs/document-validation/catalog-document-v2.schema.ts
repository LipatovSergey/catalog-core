import {
  Type,
  type Static,
  type TArray,
  type TBoolean,
  type TLiteral,
  type TObject,
  type TOptional,
  type TString,
  type TUnion,
} from '@sinclair/typebox';
import { IMAGE_KEY_PATTERN } from '../../images/image-key';

export const CatalogLocaleSchema: TUnion<
  [TLiteral<'cnr'>, TLiteral<'en'>, TLiteral<'ru'>]
> = Type.Union([Type.Literal('cnr'), Type.Literal('en'), Type.Literal('ru')]);

export type CatalogLocale = Static<typeof CatalogLocaleSchema>;

type TLocalizedTextSchema = TObject<{
  cnr: TOptional<TString>;
  en: TOptional<TString>;
  ru: TOptional<TString>;
}>;

function localizedTextSchema(maxLength: number): TLocalizedTextSchema {
  return Type.Partial(
    Type.Record(CatalogLocaleSchema, Type.String({ minLength: 1, maxLength })),
    {
      minProperties: 1,
      maxProperties: 3,
      additionalProperties: false,
    },
  );
}

const LocalizedShortTextSchema = localizedTextSchema(200);
const LocalizedDescriptionSchema = localizedTextSchema(2_000);

const PriceVariantSchema: TObject<{
  label: TOptional<TLocalizedTextSchema>;
  price: TString;
}> = Type.Object(
  {
    label: Type.Optional(LocalizedShortTextSchema),
    price: Type.String({
      minLength: 1,
      maxLength: 13,
      pattern: '^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$',
    }),
  },
  { additionalProperties: false },
);

export const ItemV2Schema: TObject<{
  id: TString;
  name: TLocalizedTextSchema;
  description: TOptional<TLocalizedTextSchema>;
  imageKey: TOptional<TString>;
  priceVariants: TArray<typeof PriceVariantSchema>;
  available: TBoolean;
}> = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    name: LocalizedShortTextSchema,
    description: Type.Optional(LocalizedDescriptionSchema),
    imageKey: Type.Optional(
      Type.String({
        pattern: IMAGE_KEY_PATTERN,
      }),
    ),
    priceVariants: Type.Array(PriceVariantSchema, {
      minItems: 1,
      maxItems: 20,
    }),
    available: Type.Boolean(),
  },
  { additionalProperties: false },
);

const SectionV2Schema: TObject<{
  id: TString;
  title: TLocalizedTextSchema;
  description: TOptional<TLocalizedTextSchema>;
  items: TArray<typeof ItemV2Schema>;
}> = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    title: LocalizedShortTextSchema,
    description: Type.Optional(LocalizedDescriptionSchema),
    items: Type.Array(ItemV2Schema, { maxItems: 500 }),
  },
  { additionalProperties: false },
);

export const CatalogDocumentV2Schema: TObject<{
  schemaVersion: TLiteral<2>;
  defaultLocale: typeof CatalogLocaleSchema;
  supportedLocales: TArray<typeof CatalogLocaleSchema>;
  title: TLocalizedTextSchema;
  description: TOptional<TLocalizedTextSchema>;
  currency: TString;
  sections: TArray<typeof SectionV2Schema>;
}> = Type.Object(
  {
    schemaVersion: Type.Literal(2),
    defaultLocale: CatalogLocaleSchema,
    supportedLocales: Type.Array(CatalogLocaleSchema, {
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
    }),
    title: LocalizedShortTextSchema,
    description: Type.Optional(LocalizedDescriptionSchema),
    currency: Type.String({ pattern: '^[A-Z]{3}$' }),
    sections: Type.Array(SectionV2Schema, { maxItems: 100 }),
  },
  { additionalProperties: false },
);

export type CatalogDocumentV2 = Static<typeof CatalogDocumentV2Schema>;
