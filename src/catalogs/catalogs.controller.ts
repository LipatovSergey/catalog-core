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
import { CatalogDocumentPipe } from './document-validation/catalog-document.pipe';
import { type CatalogDocumentV1 } from './document-validation/catalog-document-v1.schema';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Post()
  create(
    @Body(CatalogDocumentPipe) document: CatalogDocumentV1,
  ): Promise<CatalogEntity> {
    return this.catalogsService.create(document);
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
    @Body(CatalogDocumentPipe) document: CatalogDocumentV1,
  ): Promise<CatalogEntity> {
    return this.catalogsService.replaceDocument(catalogId, document);
  }
}
