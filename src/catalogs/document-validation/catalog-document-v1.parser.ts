import { TypeCompiler } from '@sinclair/typebox/compiler';
import {
  CatalogDocumentV1Schema,
  type CatalogDocumentV1,
} from './catalog-document-v1.schema';
import { validateCatalogDocumentV1Invariants } from './catalog-document-v1-invariants';
import { CatalogDocumentValidationError } from './catalog-document-validation.error';
import { registerCatalogFormats } from './catalog-formats';

registerCatalogFormats();

const catalogDocumentV1Check = TypeCompiler.Compile(CatalogDocumentV1Schema);

export function parseCatalogDocumentV1(value: unknown): CatalogDocumentV1 {
  if (catalogDocumentV1Check.Check(value)) {
    validateCatalogDocumentV1Invariants(value);
    return value;
  }

  const errors = [...catalogDocumentV1Check.Errors(value)].map((error) => ({
    path: error.path,
    message: error.message,
  }));

  throw new CatalogDocumentValidationError(errors);
}
