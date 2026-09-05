import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { isUUID } from 'class-validator';
import { IMAGE_KEY_REGEXP } from './image-key';
import { ImageNotFoundError } from './image-not-found.error';
import type { ImageStorage } from './image-storage.abstract';

export class S3ImageStorageService implements ImageStorage {
  private readonly publicBaseUrl: string;

  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    publicBaseUrl: string,
  ) {
    this.publicBaseUrl = this.normalizePublicBaseUrl(publicBaseUrl);
  }

  async save(
    catalogId: string,
    imageKey: string,
    content: Buffer,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.buildObjectKey(catalogId, imageKey),
        Body: content,
        ContentType: this.contentTypeFor(imageKey),
        IfNoneMatch: '*',
      }),
    );
  }

  async read(catalogId: string, imageKey: string): Promise<Buffer> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.buildObjectKey(catalogId, imageKey),
        }),
      );

      if (result.Body === undefined) {
        throw new Error('S3 returned an image without a body');
      }

      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error: unknown) {
      if (this.isObjectNotFoundError(error)) {
        throw new ImageNotFoundError({ cause: error });
      }
      throw error;
    }
  }

  getPublicUrl(catalogId: string, imageKey: string): string {
    const objectKey = this.buildObjectKey(catalogId, imageKey);

    return new URL(objectKey, this.publicBaseUrl).toString();
  }

  private buildObjectKey(catalogId: string, imageKey: string): string {
    if (!isUUID(catalogId)) {
      throw new Error('Invalid catalog ID');
    }

    if (!IMAGE_KEY_REGEXP.test(imageKey)) {
      throw new Error('Invalid image key');
    }

    return `${catalogId.toLowerCase()}/${imageKey}`;
  }

  private contentTypeFor(imageKey: string): string {
    if (imageKey.endsWith('.jpg')) {
      return 'image/jpeg';
    }
    if (imageKey.endsWith('.png')) {
      return 'image/png';
    }
    return 'image/webp';
  }

  private normalizePublicBaseUrl(value: string): string {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('S3 public base URL must use HTTP or HTTPS');
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error(
        'S3 public base URL must not contain credentials or query',
      );
    }

    return url.toString().endsWith('/') ? url.toString() : `${url.toString()}/`;
  }

  private isObjectNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'NoSuchKey'
    );
  }
}
