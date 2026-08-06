import {
  Type,
  type Static,
  type TArray,
  type TLiteral,
  type TObject,
  type TOptional,
  type TString,
} from '@sinclair/typebox';
import { SectionSchema } from './section.schema';

export const CatalogDocumentSchema: TObject<{
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

export type CatalogDocument = Static<typeof CatalogDocumentSchema>;
