import { Module } from '@nestjs/common';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ImageStorage } from './image-storage.abstract';
import { imageStorageProvider } from './image-storage.provider';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { PublicImagesController } from './public-images.controller';

@Module({
  imports: [CatalogsModule],
  controllers: [ImagesController, PublicImagesController],
  providers: [ImagesService, imageStorageProvider],
  exports: [ImageStorage],
})
export class ImagesModule {}
