import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import { getRequiredConfig } from '../config/environment';

@Injectable()
export class LocalImageStorageService {
  private readonly storageRoot: string;
  constructor(config: ConfigService) {
    this.storageRoot = resolve(getRequiredConfig(config, 'IMAGE_STORAGE_DIR'));
  }
}
