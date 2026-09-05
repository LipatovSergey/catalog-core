import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { isUUID } from 'class-validator';
import { IMAGE_KEY_REGEXP } from './image-key';
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
}
