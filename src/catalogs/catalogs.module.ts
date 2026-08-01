import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogEntity } from './catalog.entity';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { PublicCatalogsController } from './public-catalogs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogEntity])],
  controllers: [CatalogsController, PublicCatalogsController],
  providers: [CatalogsService],
})
export class CatalogsModule {}
