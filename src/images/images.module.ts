import { Module } from '@nestjs/common';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ImageStorageModule } from './image-storage.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { PublicImagesController } from './public-images.controller';

@Module({
  imports: [CatalogsModule, ImageStorageModule],
  controllers: [ImagesController, PublicImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
