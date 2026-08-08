import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CatalogEntity } from './catalog.entity';
import { CatalogsService } from './catalogs.service';

@Controller('public/catalogs')
export class PublicCatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get(':catalogId')
  findById(
    @Param('catalogId', new ParseUUIDPipe()) catalogId: string,
  ): Promise<CatalogEntity> {
    return this.catalogsService.findById(catalogId);
  }
}
