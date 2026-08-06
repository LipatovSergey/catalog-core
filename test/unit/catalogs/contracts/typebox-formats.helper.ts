import { FormatRegistry } from '@sinclair/typebox';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function installUuidFormat(): () => void {
  const previousUuidFormat = FormatRegistry.Get('uuid');

  FormatRegistry.Set('uuid', (value) => uuidPattern.test(value));

  return () => {
    if (previousUuidFormat) {
      FormatRegistry.Set('uuid', previousUuidFormat);
    } else {
      FormatRegistry.Delete('uuid');
    }
  };
}
