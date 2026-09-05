export abstract class ImageStorage {
  abstract save(
    catalogId: string,
    imageKey: string,
    content: Buffer,
  ): Promise<void>;

  abstract read(catalogId: string, imageKey: string): Promise<Buffer>;

  abstract getPublicUrl(catalogId: string, imageKey: string): string;
}
