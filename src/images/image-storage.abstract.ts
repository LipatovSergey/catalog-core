export abstract class ImageStorage {
  abstract save(
    catalogId: string,
    imageKey: string,
    content: Buffer,
  ): Promise<void>;

  abstract getPublicUrl(catalogId: string, imageKey: string): string;
}
