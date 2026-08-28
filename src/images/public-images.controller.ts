import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { imageContentType } from './image-key';
import { ImagesService } from './images.service';

@Controller('public/catalogs/:catalogId/images')
export class PublicImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get(':imageKey')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async read(
    @Param('catalogId', new ParseUUIDPipe()) catalogId: string,
    @Param('imageKey') imageKey: string,
  ): Promise<StreamableFile> {
    const content = await this.images.read(catalogId, imageKey);
    const contentType = imageContentType(imageKey);

    if (contentType === undefined) {
      throw new Error('Validated image key has no content type');
    }

    return new StreamableFile(content, {
      type: contentType,
      length: content.length,
    });
  }
}
