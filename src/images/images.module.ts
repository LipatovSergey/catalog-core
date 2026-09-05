import { Module } from '@nestjs/common';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ImageStorageModule } from './image-storage.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [CatalogsModule, ImageStorageModule],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
