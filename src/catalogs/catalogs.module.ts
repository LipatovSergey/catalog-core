import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageStorageModule } from '../images/image-storage.module';
import { CatalogEntity } from './catalog.entity';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { CatalogDocumentPipe } from './document-validation/catalog-document.pipe';
import { PublicCatalogsController } from './public-catalogs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogEntity]), ImageStorageModule],
  controllers: [CatalogsController, PublicCatalogsController],
  providers: [CatalogsService, CatalogDocumentPipe],
  exports: [CatalogsService],
})
export class CatalogsModule {}
