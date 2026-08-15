import { TypeCompiler } from '@sinclair/typebox/compiler';
import { validateCatalogDocumentV2Invariants } from './catalog-document-v2-invariants';
import {
  CatalogDocumentV2Schema,
  type CatalogDocumentV2,
} from './catalog-document-v2.schema';
import { CatalogDocumentValidationError } from './catalog-document-validation.error';
import { registerCatalogFormats } from './catalog-formats';

registerCatalogFormats();

const catalogDocumentV2Check = TypeCompiler.Compile(CatalogDocumentV2Schema);

export function parseCatalogDocumentV2(value: unknown): CatalogDocumentV2 {
  if (catalogDocumentV2Check.Check(value)) {
    validateCatalogDocumentV2Invariants(value);
    return value;
  }

  const errors = [...catalogDocumentV2Check.Errors(value)].map((error) => ({
    path: error.path,
    message: error.message,
  }));

  throw new CatalogDocumentValidationError(errors);
}
