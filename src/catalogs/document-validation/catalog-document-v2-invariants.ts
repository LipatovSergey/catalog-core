import {
  type CatalogDocumentV2,
  type CatalogLocale,
} from './catalog-document-v2.schema';
import {
  CatalogDocumentValidationError,
  type CatalogDocumentValidationIssue,
} from './catalog-document-validation.error';

const MAX_CATALOG_ITEMS = 5_000;

type LocalizedText = CatalogDocumentV2['title'];

function validateLocalizedText(
  errors: CatalogDocumentValidationIssue[],
  path: string,
  text: LocalizedText,
  supportedLocales: ReadonlySet<CatalogLocale>,
  defaultLocale?: CatalogLocale,
): void {
  for (const [locale, value] of Object.entries(text)) {
    if (!supportedLocales.has(locale as CatalogLocale)) {
      errors.push({
        path: `${path}/${locale}`,
        message: 'Translation locale must occur in supportedLocales',
      });
    }

    if (value.trim() === '') {
      errors.push({
        path: `${path}/${locale}`,
        message: 'String must contain a non-whitespace character',
      });
    }
  }

  if (defaultLocale !== undefined && text[defaultLocale] === undefined) {
    errors.push({
      path: `${path}/${defaultLocale}`,
      message: 'Required text must contain the default locale',
    });
  }
}

export function validateCatalogDocumentV2Invariants(
  document: CatalogDocumentV2,
): void {
  const errors: CatalogDocumentValidationIssue[] = [];
  const supportedLocales = new Set(document.supportedLocales);
  const sectionIds = new Set<string>();
  const itemIds = new Set<string>();
  let itemCount = 0;

  if (!supportedLocales.has(document.defaultLocale)) {
    errors.push({
      path: '/defaultLocale',
      message: 'Default locale must occur in supportedLocales',
    });
  }

  validateLocalizedText(
    errors,
    '/title',
    document.title,
    supportedLocales,
    document.defaultLocale,
  );

  if (document.description !== undefined) {
    validateLocalizedText(
      errors,
      '/description',
      document.description,
      supportedLocales,
    );
  }

  for (const [sectionIndex, section] of document.sections.entries()) {
    const sectionPath = `/sections/${sectionIndex}`;

    if (sectionIds.has(section.id)) {
      errors.push({
        path: `${sectionPath}/id`,
        message: 'Section ID must be unique within the catalog',
      });
    }
    sectionIds.add(section.id);

    validateLocalizedText(
      errors,
      `${sectionPath}/title`,
      section.title,
      supportedLocales,
      document.defaultLocale,
    );

    if (section.description !== undefined) {
      validateLocalizedText(
        errors,
        `${sectionPath}/description`,
        section.description,
        supportedLocales,
      );
    }

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

      validateLocalizedText(
        errors,
        `${itemPath}/name`,
        item.name,
        supportedLocales,
        document.defaultLocale,
      );

      if (item.description !== undefined) {
        validateLocalizedText(
          errors,
          `${itemPath}/description`,
          item.description,
          supportedLocales,
        );
      }

      const defaultLabels = new Set<string>();
      const hasMultiplePriceVariants = item.priceVariants.length > 1;

      for (const [variantIndex, variant] of item.priceVariants.entries()) {
        const labelPath = `${itemPath}/priceVariants/${variantIndex}/label`;

        if (variant.label === undefined) {
          if (hasMultiplePriceVariants) {
            errors.push({
              path: labelPath,
              message: 'Multiple price variants must have a label',
            });
          }
          continue;
        }

        validateLocalizedText(
          errors,
          labelPath,
          variant.label,
          supportedLocales,
          hasMultiplePriceVariants ? document.defaultLocale : undefined,
        );

        if (!hasMultiplePriceVariants) {
          continue;
        }

        const defaultLabel = variant.label[document.defaultLocale];
        if (defaultLabel === undefined) {
          continue;
        }

        if (defaultLabels.has(defaultLabel)) {
          errors.push({
            path: `${labelPath}/${document.defaultLocale}`,
            message:
              'Price variant default-locale labels must be unique within the item',
          });
        }
        defaultLabels.add(defaultLabel);
      }
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
