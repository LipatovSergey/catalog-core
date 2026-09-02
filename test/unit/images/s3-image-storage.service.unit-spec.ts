import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { ImageNotFoundError } from '../../../src/images/image-not-found.error';
import { S3ImageStorageService } from '../../../src/images/s3-image-storage.service';

const BUCKET = 'catalog-images';
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
    );
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

  it('reads the exact bytes of an image', async () => {
    const content = Uint8Array.from([0x52, 0x49, 0x46, 0x46]);
    send.mockResolvedValue({
      Body: {
        transformToByteArray: jest.fn().mockResolvedValue(content),
      },
    });

    await expect(service.read(CATALOG_ID, IMAGE_KEY)).resolves.toEqual(
      Buffer.from(content),
    );

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: BUCKET,
      Key: `${CATALOG_ID}/${IMAGE_KEY}`,
    });
  });

  it('returns a storage-independent error for an unknown image', async () => {
    send.mockRejectedValue({
      name: 'NoSuchKey',
      $metadata: { httpStatusCode: 404 },
    });

    await expect(service.read(CATALOG_ID, IMAGE_KEY)).rejects.toBeInstanceOf(
      ImageNotFoundError,
    );
  });

  it('does not hide unexpected S3 errors', async () => {
    const error = Object.assign(new Error('S3 unavailable'), {
      $metadata: { httpStatusCode: 503 },
    });
    send.mockRejectedValue(error);

    await expect(service.read(CATALOG_ID, IMAGE_KEY)).rejects.toBe(error);
  });

  it('does not treat a missing bucket as a missing image', async () => {
    const error = {
      name: 'NoSuchBucket',
      $metadata: { httpStatusCode: 404 },
    };
    send.mockRejectedValue(error);

    await expect(service.read(CATALOG_ID, IMAGE_KEY)).rejects.toBe(error);
  });

  it('rejects invalid identifiers before sending an S3 command', async () => {
    await expect(
      service.save('../catalog', IMAGE_KEY, Buffer.from('image')),
    ).rejects.toThrow('Invalid catalog ID');
    await expect(service.read(CATALOG_ID, '../../secret.webp')).rejects.toThrow(
      'Invalid image key',
    );
    expect(send).not.toHaveBeenCalled();
  });
});
