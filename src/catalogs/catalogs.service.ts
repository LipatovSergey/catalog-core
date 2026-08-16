import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogEntity } from './catalog.entity';
import { CatalogDocumentValidationError } from './document-validation/catalog-document-validation.error';
import { type CatalogDocumentV2 } from './document-validation/catalog-document-v2.schema';
import { parseCatalogDocumentV2 } from './document-validation/catalog-document-v2.parser';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogEntity)
    private readonly catalogs: Repository<CatalogEntity>,
  ) {}

  create(document: CatalogDocumentV2): Promise<CatalogEntity> {
    return this.catalogs.save(this.catalogs.create({ document }));
  }

  async findById(id: string): Promise<CatalogEntity> {
    const catalog = await this.findEntityById(id);
    catalog.document = this.parseStoredDocument(catalog.document);
    return catalog;
  }

  async replaceDocument(
    id: string,
    document: CatalogDocumentV2,
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

  private parseStoredDocument(value: unknown): CatalogDocumentV2 {
    try {
      return parseCatalogDocumentV2(value);
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
