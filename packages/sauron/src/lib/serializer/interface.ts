import { Schema } from '../schema';

export interface BaseSerializerConfig {
  schema: Schema;
}

export interface ArvoSerializerConfig extends BaseSerializerConfig {
  type: 'arvo';
}

export type SerializerConfig = ArvoSerializerConfig;
