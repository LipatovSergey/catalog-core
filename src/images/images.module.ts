import { Module } from '@nestjs/common';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { LocalImageStorageService } from './local-image-storage.service';

@Module({
  imports: [CatalogsModule],
  controllers: [ImagesController],
  providers: [ImagesService, LocalImageStorageService],
  exports: [LocalImageStorageService],
})
export class ImagesModule {}
