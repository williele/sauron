import 'reflect-metadata';
import { ArrayType, NamedRecordType, SchemaType } from './interface';

/**
 * Construct record schema by decorators
 */

const RECORD = '_record';
const FIELDS = '_fields';

export function Record(
  config?: Omit<NamedRecordType, 'name' | 'fields'> & { name?: string }
) {
  return function (constructor: NewableFunction) {
    const record: NamedRecordType = {
      name: config?.name || constructor.name,
      fields: Reflect.getMetadata(FIELDS, constructor) || {},
      ...config,
    };

    Reflect.defineMetadata(RECORD, record, constructor);
  };
}

/**
 * @decorator
 *
 * Define record field
 * @param order
 * @param config
 * @returns
 */
export function Field(order: number, config: SchemaType | { new (...args) }) {
  return function (target: unknown, key: string) {
    let field: SchemaType & { order: number };
    if (typeof config === 'string') {
      // Schema type as string
      field = { order, type: config };
    } else if (typeof config === 'function') {
      // Schema type as decorator
      const record = getRecordData(config);
      if (!record) {
        throw new Error(
          `Unknown ${config} as field. Make sure it used @Record`
        );
      }

      field = { order, type: 'pointer', pointer: record.name, ref: config };
    } else {
      // Schema type as definition
      field = { order, ...config };
    }

    const fields = Reflect.getMetadata(FIELDS, target.constructor);
    if (!fields) {
      // Fields not defined
      Reflect.defineMetadata(FIELDS, { [key]: field }, target.constructor);
    } else {
      // Fields already defined
      Reflect.defineMetadata(
        FIELDS,
        { ...fields, [key]: field },
        target.constructor
      );
    }
  };
}

/**
 * @decorator
 *
 * Define array field
 * @param order
 * @param items
 * @param config
 * @returns
 */
export function ArrayField(
  order: number,
  items: SchemaType | { new (...args) },
  config?: Omit<ArrayType, 'type' | 'items'>
) {
  let item: SchemaType;
  if (typeof items === 'string') {
    // Schema type as string
    item = { type: items };
  } else if (typeof items === 'function') {
    // Schema type as decorator
    const record = getRecordData(items);
    if (!record) {
      throw new Error(`Unknown ${items} as field. Make sure it used @Record`);
    }

    item = { type: 'pointer', pointer: record.name, ref: items };
  } else {
    // Schema type as definition
    item = items;
  }

  return Field(order, { type: 'array', ...(config || {}), items: item });
}

export function getRecordData(target): NamedRecordType {
  return Reflect.getMetadata(RECORD, target);
}
