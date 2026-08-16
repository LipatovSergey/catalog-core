import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { CatalogDocumentValidationError } from './catalog-document-validation.error';
import { type CatalogDocumentV2 } from './catalog-document-v2.schema';
import { parseCatalogDocumentV2 } from './catalog-document-v2.parser';

@Injectable()
export class CatalogDocumentPipe implements PipeTransform<
  unknown,
  CatalogDocumentV2
> {
  transform(value: unknown): CatalogDocumentV2 {
    try {
      return parseCatalogDocumentV2(value);
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
