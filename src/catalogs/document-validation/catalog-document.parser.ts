import { TypeCompiler } from '@sinclair/typebox/compiler';
import {
  CatalogDocumentSchema,
  type CatalogDocument,
} from './catalog-document.schema';
import { validateCatalogDocumentInvariants } from './catalog-document-invariants';
import { CatalogDocumentValidationError } from './catalog-document-validation.error';
import { registerCatalogFormats } from './catalog-formats';

registerCatalogFormats();

const catalogDocumentCheck = TypeCompiler.Compile(CatalogDocumentSchema);

export function parseCatalogDocument(value: unknown): CatalogDocument {
  if (catalogDocumentCheck.Check(value)) {
    validateCatalogDocumentInvariants(value);
    return value;
  }

  const errors = [...catalogDocumentCheck.Errors(value)].map((error) => ({
    path: error.path,
    message: error.message,
  }));

  throw new CatalogDocumentValidationError(errors);
}
