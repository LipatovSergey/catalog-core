export const IMAGE_KEY_PATTERN =
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp)$';

export const IMAGE_KEY_REGEXP = new RegExp(IMAGE_KEY_PATTERN);

export function imageContentType(imageKey: string): string | undefined {
  if (imageKey.endsWith('.jpg')) {
    return 'image/jpeg';
  }
  if (imageKey.endsWith('.png')) {
    return 'image/png';
  }
  if (imageKey.endsWith('.webp')) {
    return 'image/webp';
  }
  return undefined;
}
