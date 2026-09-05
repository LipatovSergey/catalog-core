import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { isUUID } from 'class-validator';
import { getRequiredConfig } from '../config/environment';
import { IMAGE_KEY_REGEXP } from './image-key';
import { ImageNotFoundError } from './image-not-found.error';
import type { ImageStorage } from './image-storage.abstract';

@Injectable()
export class LocalImageStorageService implements ImageStorage {
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

  async read(catalogId: string, imageKey: string): Promise<Buffer> {
    const imagePath = this.resolveImagePath(catalogId, imageKey);

    try {
      return await readFile(imagePath);
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        throw new ImageNotFoundError({ cause: error });
      }
      throw error;
    }
  }

  getPublicUrl(catalogId: string, imageKey: string): string {
    this.resolveImagePath(catalogId, imageKey);

    return `/api/public/catalogs/${catalogId.toLowerCase()}/images/${imageKey}`;
  }

  private resolveImagePath(catalogId: string, imageKey: string): string {
    if (!isUUID(catalogId)) {
      throw new Error('Invalid catalog ID');
    }

    if (!IMAGE_KEY_REGEXP.test(imageKey)) {
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

  private isFileNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
