import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { type CatalogDocument } from './catalog-document.schema';
import { CatalogDocumentValidationError } from './catalog-document-validation.error';
import { parseCatalogDocument } from './catalog-document.parser';

@Injectable()
export class CatalogDocumentPipe implements PipeTransform<
  unknown,
  CatalogDocument
> {
  transform(value: unknown): CatalogDocument {
    try {
      return parseCatalogDocument(value);
    } catch (error: unknown) {
      if (error instanceof CatalogDocumentValidationError) {
        throw new BadRequestException({
          code: 'INVALID_CATALOG_DOCUMENT',
          message: error.message,
          errors: error.errors,
        });
      }
      throw error;
    }
  }
}
