import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogEntity } from './catalog.entity';
import { type CatalogDocument } from './document-validation/catalog-document.schema';
import { CatalogDocumentValidationError } from './document-validation/catalog-document-validation.error';
import { parseCatalogDocument } from './document-validation/catalog-document.parser';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogEntity)
    private readonly catalogs: Repository<CatalogEntity>,
  ) {}

  create(document: CatalogDocument): Promise<CatalogEntity> {
    return this.catalogs.save(this.catalogs.create({ document }));
  }

  async findById(id: string): Promise<CatalogEntity> {
    const catalog = await this.findEntityById(id);
    catalog.document = this.parseStoredDocument(catalog.document);
    return catalog;
  }

  async replaceDocument(
    id: string,
    document: CatalogDocument,
  ): Promise<CatalogEntity> {
    const catalog = await this.findEntityById(id);
    catalog.document = document;
    return this.catalogs.save(catalog);
  }

  private async findEntityById(id: string): Promise<CatalogEntity> {
    const catalog = await this.catalogs.findOneBy({ id });
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }
    return catalog;
  }

  private parseStoredDocument(value: unknown): CatalogDocument {
    try {
      return parseCatalogDocument(value);
    } catch (error: unknown) {
      if (error instanceof CatalogDocumentValidationError) {
        throw new InternalServerErrorException({
          code: 'INVALID_STORED_CATALOG_DOCUMENT',
          message: 'Stored catalog document is invalid',
        });
      }
      throw error;
    }
  }
}
