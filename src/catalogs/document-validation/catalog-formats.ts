import { FormatRegistry } from '@sinclair/typebox';
import { isUUID } from 'class-validator';

export function registerCatalogFormats(): void {
  FormatRegistry.Set('uuid', (value) => isUUID(value));
}
