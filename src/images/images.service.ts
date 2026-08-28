import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IMAGE_KEY_REGEXP } from './image-key';
import { LocalImageStorageService } from './local-image-storage.service';

type ImageExtension = 'jpg' | 'png' | 'webp';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

@Injectable()
export class ImagesService {
  constructor(private readonly storage: LocalImageStorageService) {}

  async upload(catalogId: string, content: Buffer): Promise<string> {
    const extension = this.detectExtension(content);
    if (extension === undefined) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: 'Only JPEG, PNG, and WebP images are supported',
      });
    }

    const imageKey = `${randomUUID()}.${extension}`;
    await this.storage.save(catalogId, imageKey, content);
    return imageKey;
  }

  async read(catalogId: string, imageKey: string): Promise<Buffer> {
    if (!IMAGE_KEY_REGEXP.test(imageKey)) {
      throw new BadRequestException({
        code: 'INVALID_IMAGE_KEY',
        message: 'Image key is invalid',
      });
    }

    try {
      return await this.storage.read(catalogId, imageKey);
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        throw new NotFoundException({
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found',
        });
      }
      throw error;
    }
  }

  private detectExtension(content: Buffer): ImageExtension | undefined {
    if (
      content.length >= PNG_SIGNATURE.length &&
      content.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    ) {
      return 'png';
    }

    if (
      content.length >= 3 &&
      content[0] === 0xff &&
      content[1] === 0xd8 &&
      content[2] === 0xff
    ) {
      return 'jpg';
    }

    if (
      content.length >= 12 &&
      content.subarray(0, 4).toString('ascii') === 'RIFF' &&
      content.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'webp';
    }

    return undefined;
  }

  private isFileNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
