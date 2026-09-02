import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImageNotFoundError } from '../../../src/images/image-not-found.error';
import { ImageStorage } from '../../../src/images/image-storage.abstract';
import { ImagesService } from '../../../src/images/images.service';

const CATALOG_ID = '4cec0b8a-01d1-4afe-a8fe-d529767baa80';

describe('ImagesService', () => {
  let save: jest.MockedFunction<ImageStorage['save']>;
  let read: jest.MockedFunction<ImageStorage['read']>;
  let service: ImagesService;

  beforeEach(() => {
    save = jest.fn();
    read = jest.fn();
    service = new ImagesService({
      save,
      read,
    });
  });

  it.each([
    ['jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['webp', Buffer.from('RIFF1234WEBP', 'ascii')],
  ])('detects and saves a %s image', async (extension, content) => {
    const imageKey = await service.upload(CATALOG_ID, content);

    expect(imageKey).toMatch(
      new RegExp(
        `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.${extension}$`,
      ),
    );
    expect(save).toHaveBeenCalledWith(CATALOG_ID, imageKey, content);
  });

  it('rejects unsupported content without saving it', async () => {
    await expect(
      service.upload(CATALOG_ID, Buffer.from('not an image')),
    ).rejects.toEqual(
      new BadRequestException({
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: 'Only JPEG, PNG, and WebP images are supported',
      }),
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('reads a valid image key from storage', async () => {
    const imageKey = '550e8400-e29b-41d4-a716-446655440000.png';
    const content = Buffer.from('image');
    read.mockResolvedValue(content);

    await expect(service.read(CATALOG_ID, imageKey)).resolves.toEqual(content);
    expect(read).toHaveBeenCalledWith(CATALOG_ID, imageKey);
  });

  it('rejects an invalid image key without reading storage', async () => {
    await expect(service.read(CATALOG_ID, '../../secret.png')).rejects.toEqual(
      new BadRequestException({
        code: 'INVALID_IMAGE_KEY',
        message: 'Image key is invalid',
      }),
    );
    expect(read).not.toHaveBeenCalled();
  });

  it('translates a missing file into an image not-found response', async () => {
    read.mockRejectedValue(new ImageNotFoundError());

    await expect(
      service.read(CATALOG_ID, '550e8400-e29b-41d4-a716-446655440000.webp'),
    ).rejects.toEqual(
      new NotFoundException({
        code: 'IMAGE_NOT_FOUND',
        message: 'Image not found',
      }),
    );
  });

  it('does not hide unexpected storage errors', async () => {
    const error = Object.assign(new Error('Permission denied'), {
      code: 'EACCES',
    });
    read.mockRejectedValue(error);

    await expect(
      service.read(CATALOG_ID, '550e8400-e29b-41d4-a716-446655440000.webp'),
    ).rejects.toBe(error);
  });
});
