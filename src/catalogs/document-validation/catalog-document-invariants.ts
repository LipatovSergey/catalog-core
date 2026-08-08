import { type CatalogDocument } from './catalog-document.schema';
import {
  CatalogDocumentValidationError,
  type CatalogDocumentValidationIssue,
} from './catalog-document-validation.error';

const MAX_CATALOG_ITEMS = 5_000;

function addWhitespaceIssue(
  errors: CatalogDocumentValidationIssue[],
  path: string,
  value: string | undefined,
): void {
  if (value !== undefined && value.trim() === '') {
    errors.push({
      path,
      message: 'String must contain a non-whitespace character',
    });
  }
}

export function validateCatalogDocumentInvariants(
  document: CatalogDocument,
): void {
  const errors: CatalogDocumentValidationIssue[] = [];
  const sectionIds = new Set<string>();
  const itemIds = new Set<string>();
  let itemCount = 0;

  addWhitespaceIssue(errors, '/title', document.title);
  addWhitespaceIssue(errors, '/description', document.description);

  for (const [sectionIndex, section] of document.sections.entries()) {
    const sectionPath = `/sections/${sectionIndex}`;

    if (sectionIds.has(section.id)) {
      errors.push({
        path: `${sectionPath}/id`,
        message: 'Section ID must be unique within the catalog',
      });
    }
    sectionIds.add(section.id);

    addWhitespaceIssue(errors, `${sectionPath}/title`, section.title);
    addWhitespaceIssue(
      errors,
      `${sectionPath}/description`,
      section.description,
    );

    itemCount += section.items.length;

    for (const [itemIndex, item] of section.items.entries()) {
      const itemPath = `${sectionPath}/items/${itemIndex}`;

      if (itemIds.has(item.id)) {
        errors.push({
          path: `${itemPath}/id`,
          message: 'Item ID must be unique within the catalog',
        });
      }
      itemIds.add(item.id);

      addWhitespaceIssue(errors, `${itemPath}/name`, item.name);
      addWhitespaceIssue(errors, `${itemPath}/description`, item.description);
    }
  }

  if (itemCount > MAX_CATALOG_ITEMS) {
    errors.push({
      path: '/sections',
      message: `Catalog must contain no more than ${MAX_CATALOG_ITEMS} items`,
    });
  }

  if (errors.length > 0) {
    throw new CatalogDocumentValidationError(errors);
  }
}
