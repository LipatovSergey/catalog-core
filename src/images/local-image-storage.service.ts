import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { isUUID } from 'class-validator';
import { getRequiredConfig } from '../config/environment';

const IMAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

@Injectable()
export class LocalImageStorageService {
  private readonly storageRoot: string;

  constructor(config: ConfigService) {
    this.storageRoot = resolve(getRequiredConfig(config, 'IMAGE_STORAGE_DIR'));
  }

  async save(
    catalogId: string,
    imageKey: string,
    content: Buffer,
  ): Promise<void> {
    const imagePath = this.resolveImagePath(catalogId, imageKey);

    await mkdir(dirname(imagePath), { recursive: true });
    await writeFile(imagePath, content, { flag: 'wx' });
  }

  private resolveImagePath(catalogId: string, imageKey: string): string {
    if (!isUUID(catalogId)) {
      throw new Error('Invalid catalog ID');
    }

    if (!IMAGE_KEY_PATTERN.test(imageKey)) {
      throw new Error('Invalid image key');
    }

    const imagePath = resolve(
      this.storageRoot,
      catalogId.toLowerCase(),
      imageKey,
    );
    const relativePath = relative(this.storageRoot, imagePath);

    if (
      relativePath === '' ||
      relativePath === '..' ||
      relativePath.startsWith(`..${sep}`)
    ) {
      throw new Error('Image path escapes storage root');
    }

    return imagePath;
  }
}
