import {
  BadRequestException,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogsService } from '../catalogs/catalogs.service';
import { ImagesService } from './images.service';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type UploadedImage = {
  buffer: Buffer;
};

@Controller('catalogs/:catalogId/images')
export class ImagesController {
  constructor(
    private readonly catalogs: CatalogsService,
    private readonly images: ImagesService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
    }),
  )
  async upload(
    @Param('catalogId', new ParseUUIDPipe()) catalogId: string,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<{ imageKey: string }> {
    if (file === undefined) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'Image file is required',
      });
    }

    await this.catalogs.findById(catalogId);
    const imageKey = await this.images.upload(catalogId, file.buffer);
    return { imageKey };
  }
}
