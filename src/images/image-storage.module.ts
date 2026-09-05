import { Module } from '@nestjs/common';
import { ImageStorage } from './image-storage.abstract';
import { imageStorageProvider } from './image-storage.provider';

@Module({
  providers: [imageStorageProvider],
  exports: [ImageStorage],
})
export class ImageStorageModule {}
