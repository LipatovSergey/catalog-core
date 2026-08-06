import {
  Type,
  type Static,
  type TArray,
  type TObject,
  type TOptional,
  type TString,
} from '@sinclair/typebox';
import { ItemSchema } from './item.schema';

export const SectionSchema: TObject<{
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

export type Section = Static<typeof SectionSchema>;
