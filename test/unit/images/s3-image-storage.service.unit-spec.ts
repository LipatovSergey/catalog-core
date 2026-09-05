import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { S3ImageStorageService } from '../../../src/images/s3-image-storage.service';

const BUCKET = 'catalog-images';
const PUBLIC_BASE_URL = 'http://localhost:9000/catalog-images/';
const CATALOG_ID = '4cec0b8a-01d1-4afe-a8fe-d529767baa80';
const IMAGE_KEY = '550e8400-e29b-41d4-a716-446655440000.webp';

describe('S3ImageStorageService', () => {
  let send: jest.Mock;
  let service: S3ImageStorageService;

  beforeEach(() => {
    send = jest.fn();
    service = new S3ImageStorageService(
      { send } as unknown as S3Client,
      BUCKET,
      PUBLIC_BASE_URL,
    );
  });

  it('builds a permanent public URL for an image', () => {
    expect(service.getPublicUrl(CATALOG_ID.toUpperCase(), IMAGE_KEY)).toBe(
      `${PUBLIC_BASE_URL}${CATALOG_ID}/${IMAGE_KEY}`,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('normalizes a public base URL without a trailing slash', () => {
    service = new S3ImageStorageService(
      { send } as unknown as S3Client,
      BUCKET,
      'https://images.example.com/catalog-images',
    );

    expect(service.getPublicUrl(CATALOG_ID, IMAGE_KEY)).toBe(
      `https://images.example.com/catalog-images/${CATALOG_ID}/${IMAGE_KEY}`,
    );
  });

  it.each([
    'ftp://images.example.com/catalog-images/',
    'https://user:password@images.example.com/catalog-images/',
    'https://images.example.com/catalog-images/?token=secret',
  ])('rejects an unsafe public base URL: %s', (publicBaseUrl) => {
    expect(
      () =>
        new S3ImageStorageService(
          { send } as unknown as S3Client,
          BUCKET,
          publicBaseUrl,
        ),
    ).toThrow('S3 public base URL');
  });

  it('saves an image without allowing an existing object to be overwritten', async () => {
    send.mockResolvedValue({});
    const content = Buffer.from('image');

    await service.save(CATALOG_ID, IMAGE_KEY, content);

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: BUCKET,
      Key: `${CATALOG_ID}/${IMAGE_KEY}`,
      Body: content,
      ContentType: 'image/webp',
      IfNoneMatch: '*',
    });
  });

  it.each([
    ['jpg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
  ])('stores a .%s object with %s content type', async (extension, type) => {
    send.mockResolvedValue({});

    await service.save(
      CATALOG_ID,
      `550e8400-e29b-41d4-a716-446655440000.${extension}`,
      Buffer.from('image'),
    );

    const command = send.mock.calls[0]?.[0];
    expect(command.input.ContentType).toBe(type);
  });

  it('rejects invalid identifiers before sending an S3 command', async () => {
    await expect(
      service.save('../catalog', IMAGE_KEY, Buffer.from('image')),
    ).rejects.toThrow('Invalid catalog ID');
    await expect(
      service.save(CATALOG_ID, '../../secret.webp', Buffer.from('image')),
    ).rejects.toThrow('Invalid image key');
    expect(() => service.getPublicUrl('../catalog', IMAGE_KEY)).toThrow(
      'Invalid catalog ID',
    );
    expect(send).not.toHaveBeenCalled();
  });
});
