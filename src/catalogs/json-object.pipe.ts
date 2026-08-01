import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class JsonObjectPipe implements PipeTransform<unknown, object> {
  transform(value: unknown): object {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Document root must be a JSON object');
    }
    return value;
  }
}
