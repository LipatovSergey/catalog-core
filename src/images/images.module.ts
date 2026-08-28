import { Module } from '@nestjs/common';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { LocalImageStorageService } from './local-image-storage.service';
import { PublicImagesController } from './public-images.controller';

@Module({
  imports: [CatalogsModule],
  controllers: [ImagesController, PublicImagesController],
  providers: [ImagesService, LocalImageStorageService],
  exports: [LocalImageStorageService],
})
export class ImagesModule {}
