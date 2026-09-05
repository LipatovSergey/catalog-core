import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ImageNotFoundError } from '../../../src/images/image-not-found.error';
import { LocalImageStorageService } from '../../../src/images/local-image-storage.service';

const CATALOG_ID = '4cec0b8a-01d1-4afe-a8fe-d529767baa80';
const IMAGE_KEY = '550e8400-e29b-41d4-a716-446655440000.webp';

describe('LocalImageStorageService', () => {
  let storageRoot: string;
  let service: LocalImageStorageService;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'catalog-core-images-unit-'));
    service = new LocalImageStorageService(
      new ConfigService({ IMAGE_STORAGE_DIR: storageRoot }),
    );
  });

  afterEach(async () => {
    await rm(storageRoot, { recursive: true, force: true });
  });

  it('saves the exact bytes under the catalog and image key', async () => {
    const content = Buffer.from([0x52, 0x49, 0x46, 0x46]);

    await service.save(CATALOG_ID, IMAGE_KEY, content);

    await expect(
      readFile(join(storageRoot, CATALOG_ID, IMAGE_KEY)),
    ).resolves.toEqual(content);
  });

  it('does not overwrite an existing image', async () => {
    const originalContent = Buffer.from('original');

    await service.save(CATALOG_ID, IMAGE_KEY, originalContent);

    await expect(
      service.save(CATALOG_ID, IMAGE_KEY, Buffer.from('replacement')),
    ).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(
      readFile(join(storageRoot, CATALOG_ID, IMAGE_KEY)),
    ).resolves.toEqual(originalContent);
  });

  it('normalizes the catalog UUID to lowercase', async () => {
    await service.save(CATALOG_ID.toUpperCase(), IMAGE_KEY, Buffer.from('x'));

    await expect(
      readFile(join(storageRoot, CATALOG_ID, IMAGE_KEY)),
    ).resolves.toEqual(Buffer.from('x'));
  });

  it('reads the exact bytes of a saved image', async () => {
    const content = Buffer.from('stored image');
    await service.save(CATALOG_ID, IMAGE_KEY, content);

    await expect(service.read(CATALOG_ID, IMAGE_KEY)).resolves.toEqual(content);
  });

  it('builds a public backend URL for an image', () => {
    expect(service.getPublicUrl(CATALOG_ID.toUpperCase(), IMAGE_KEY)).toBe(
      `/api/public/catalogs/${CATALOG_ID}/images/${IMAGE_KEY}`,
    );
  });

  it('returns a storage-independent error for an unknown image', async () => {
    await expect(service.read(CATALOG_ID, IMAGE_KEY)).rejects.toBeInstanceOf(
      ImageNotFoundError,
    );
  });

  it.each([
    ['an invalid catalog ID', '../catalog', IMAGE_KEY],
    ['a traversal image key', CATALOG_ID, '../../secret.webp'],
    ['an absolute image path', CATALOG_ID, '/tmp/secret.webp'],
    [
      'an image URL',
      CATALOG_ID,
      'https://example.com/550e8400-e29b-41d4-a716-446655440000.webp',
    ],
    [
      'an unsupported extension',
      CATALOG_ID,
      '550e8400-e29b-41d4-a716-446655440000.svg',
    ],
  ])('rejects %s', async (_case, catalogId, imageKey) => {
    await expect(
      service.save(catalogId, imageKey, Buffer.from('content')),
    ).rejects.toThrow();
    await expect(readdir(storageRoot)).resolves.toEqual([]);
  });
});
