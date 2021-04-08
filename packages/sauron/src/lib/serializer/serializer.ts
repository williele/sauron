import { Schema } from '../schema/schema';

export abstract class BaseSerializer {
  constructor(protected readonly schema: Schema) {}

  abstract serializerName: string;

  abstract encode<T>(name: string, val: T): Buffer;
  abstract decode<T>(name: string, buffer: Buffer): T;
}
