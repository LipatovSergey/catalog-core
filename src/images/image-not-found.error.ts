export class ImageNotFoundError extends Error {
  constructor(options?: ErrorOptions) {
    super('Image not found', options);
    this.name = 'ImageNotFoundError';
  }
}
