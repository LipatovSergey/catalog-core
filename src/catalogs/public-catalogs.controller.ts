import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ImageStorage } from '../images/image-storage.abstract';
import {
  CatalogsService,
  type ValidatedCatalogEntity,
} from './catalogs.service';

type PublicCatalogResponse = ValidatedCatalogEntity & {
  imageUrls: Record<string, string>;
};

@Controller('public/catalogs')
export class PublicCatalogsController {
  constructor(
    private readonly catalogsService: CatalogsService,
    private readonly imageStorage: ImageStorage,
  ) {}

  @Get(':catalogId')
  async findById(
    @Param('catalogId', new ParseUUIDPipe()) catalogId: string,
  ): Promise<PublicCatalogResponse> {
    const catalog = await this.catalogsService.findById(catalogId);
    const imageKeys = new Set<string>();
    for (const section of catalog.document.sections) {
      for (const item of section.items) {
        if (item.imageKey !== undefined) {
          imageKeys.add(item.imageKey);
        }
      }
    }
    const imageUrls = Object.fromEntries(
      [...imageKeys].map((imageKey) => [
        imageKey,
        this.imageStorage.getPublicUrl(catalog.id, imageKey),
      ]),
    );

    return { ...catalog, imageUrls };
  }
}
