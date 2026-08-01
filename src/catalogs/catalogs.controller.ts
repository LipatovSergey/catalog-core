import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CatalogEntity } from './catalog.entity';
import { CatalogsService } from './catalogs.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { JsonObjectPipe } from './json-object.pipe';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Post()
  create(@Body() dto: CreateCatalogDto): Promise<CatalogEntity> {
    return this.catalogsService.create(dto.slug);
  }

  @Get(':catalogId')
  findById(
    @Param('catalogId', new ParseUUIDPipe()) catalogId: string,
  ): Promise<CatalogEntity> {
    return this.catalogsService.findById(catalogId);
  }

  @Put(':catalogId/document')
  replaceDocument(
    @Param('catalogId', new ParseUUIDPipe()) catalogId: string,
    @Body(JsonObjectPipe) document: object,
  ): Promise<CatalogEntity> {
    return this.catalogsService.replaceDocument(catalogId, document);
  }
}
