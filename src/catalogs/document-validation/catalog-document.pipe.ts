import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { type CatalogDocumentV1 } from './catalog-document-v1.schema';
import { CatalogDocumentValidationError } from './catalog-document-validation.error';
import { parseCatalogDocumentV1 } from './catalog-document-v1.parser';

@Injectable()
export class CatalogDocumentPipe implements PipeTransform<
  unknown,
  CatalogDocumentV1
> {
  transform(value: unknown): CatalogDocumentV1 {
    try {
      return parseCatalogDocumentV1(value);
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
