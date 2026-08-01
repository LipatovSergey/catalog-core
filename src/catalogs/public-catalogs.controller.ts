import { Controller, Get, Param } from '@nestjs/common';
import { CatalogEntity } from './catalog.entity';
import { CatalogsService } from './catalogs.service';

@Controller('public/catalogs')
export class PublicCatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<CatalogEntity> {
    return this.catalogsService.findBySlug(slug);
  }
}
