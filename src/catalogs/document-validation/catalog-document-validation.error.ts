export type CatalogDocumentValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export class CatalogDocumentValidationError extends Error {
  readonly errors: readonly CatalogDocumentValidationIssue[];

  constructor(errors: readonly CatalogDocumentValidationIssue[]) {
    super('Catalog document is invalid');
    this.name = 'CatalogDocumentValidationError';
    this.errors = errors;
  }
}
