import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CatalogEntity } from './catalog.entity';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogEntity)
    private readonly catalogs: Repository<CatalogEntity>,
  ) {}

  async create(slug: string): Promise<CatalogEntity> {
    try {
      return await this.catalogs.save(this.catalogs.create({ slug, document: {} }));
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Catalog slug is already in use');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<CatalogEntity> {
    const catalog = await this.catalogs.findOneBy({ id });
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }
    return catalog;
  }

  async findBySlug(slug: string): Promise<CatalogEntity> {
    const catalog = await this.catalogs.findOneBy({ slug });
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }
    return catalog;
  }

  async replaceDocument(id: string, document: object): Promise<CatalogEntity> {
    const catalog = await this.findById(id);
    catalog.document = document;
    return this.catalogs.save(catalog);
  }
}
