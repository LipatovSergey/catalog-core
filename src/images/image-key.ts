export const IMAGE_KEY_PATTERN =
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp)$';

export const IMAGE_KEY_REGEXP = new RegExp(IMAGE_KEY_PATTERN);
