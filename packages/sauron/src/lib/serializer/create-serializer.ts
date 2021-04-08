import { ArvoSerializer } from './arvo-serializer';
import { SerializerConfig } from './interface';

export function createSerializer(config: SerializerConfig) {
  if (config.type === 'arvo') {
    return new ArvoSerializer(config.schema);
  } else {
    throw new Error(`Unknown serializer`);
  }
}
