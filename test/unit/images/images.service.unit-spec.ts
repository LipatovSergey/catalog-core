import { BadRequestException } from '@nestjs/common';
import { ImageStorage } from '../../../src/images/image-storage.abstract';
import { ImagesService } from '../../../src/images/images.service';

const CATALOG_ID = '4cec0b8a-01d1-4afe-a8fe-d529767baa80';

describe('ImagesService', () => {
  let save: jest.MockedFunction<ImageStorage['save']>;
  let getPublicUrl: jest.MockedFunction<ImageStorage['getPublicUrl']>;
  let service: ImagesService;

  beforeEach(() => {
    save = jest.fn();
    getPublicUrl = jest.fn();
    service = new ImagesService({
      save,
      getPublicUrl,
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
});
