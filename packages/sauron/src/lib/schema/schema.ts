import { verifyName } from '../utils/verify-name';
import { getRecordData } from './decorators';
import {
  Receiver,
  NamedRecordType,
  ServiceSchema,
  RecordDefinition,
  RecordType,
  SchemaType,
} from './interface';

/**
 * Schema of a service
 * Store records, methods, commands, signals
 */
export class Schema {
  private _lock = false;

  private readonly records: Record<string, NamedRecordType> = {};
  private readonly recordClasses: Record<string, unknown> = {};

  private readonly receivers: Record<string, Record<string, Receiver>> = {};

  constructor(
    private readonly serviceName: string,
    private readonly serializer: string
  ) {}

  /**
   * Normalize to service schema
   * @returns
   */
  normalize(): ServiceSchema {
    return {
      name: this.serviceName,
      serializer: this.serializer,
      records: this.records,
      receivers: this.receivers,
    };
  }

  /**
   * Lock the schema
   * reverse from modify
   * After lock cannot unlock
   */
  lock() {
    this._lock = true;
  }

  /**
   * Parse schema format to Schema class
   * @param schema
   * @returns
   */
  static parse(schema: ServiceSchema): Schema {
    const result = new Schema(schema.name, schema.serializer);
    // Add receivers
    Object.entries(schema.receivers).forEach(([namespace, receivers]) => {
      Object.values(receivers).forEach((receiver) =>
        result.addReceiver(namespace, receiver)
      );
    });
    // Add records
    Object.values(schema.records).forEach((record) => result.addRecord(record));

    return result;
  }

  /**
   * Validate record is exists
   * Validate record format
   * @param name
   * @param context
   */
  private validateRecord(name: string, context?: string) {
    if (!this.records[name]) {
      if (context) throw new Error(`${context}: record ${name} undefined`);
      else throw new Error(`Record ${name} undefined`);
    }
  }

  /**
   * Validate if schema already lock
   */
  private validateLock() {
    if (this._lock) {
      throw new Error(`Schema already lock cannot modify`);
    }
  }

  /**
   * Verify record if is valid
   * @param path
   * @param schema
   * @param hasName if this is named record
   * @returns record name if has
   */
  private verifyRecord(
    path: string,
    schema: RecordType,
    hasName = false
  ): string {
    const name = schema.name;
    if (hasName && !verifyName(name)) {
      throw new Error(`Record name '${name}' is invalid`);
    }

    // Verify field name and order
    if (!schema.fields || typeof schema.fields !== 'object') {
      throw new Error(`${path} fields is invalid`);
    }

    // Verify field name and order
    // Order should not duplicate and smaller than 0
    const fields = Object.entries(schema.fields);
    const orders: Record<number, string> = {};
    for (const [name, def] of fields) {
      // Verify field name
      if (!verifyName(name)) {
        throw new Error(`${path} field name '${name}' is invalid`);
      }

      const fieldPath = `${path}.${name}`;
      // Order
      const order = def.order;
      if (!order) {
        throw new Error(`${fieldPath} order is missing`);
      }
      if (order < 0 || !Number.isInteger(order)) {
        throw new Error(`${fieldPath} order is invalid`);
      }
      if (orders[order]) {
        throw new Error(
          `${fieldPath} order ${order} duplicated. Used on '${orders[order]}'`
        );
      }
      orders[order] = name;

      // Verify field
      this.verifyField(fieldPath, def);
    }

    return name;
  }

  /**
   * Verify each field in record
   * Focus on complex field
   * @param path
   * @param schema
   */
  private verifyField(path: string, schema: SchemaType) {
    const s = typeof schema === 'string' ? { type: schema } : schema;

    switch (s.type) {
      case 'record':
        this.verifyRecord(path, s);
        break;
      case 'pointer':
        if (s.$ref) {
          // If ref exists, meaning record used decorator, then add decorator
          s.ref = this.addRecord(s.$ref);
        }
        // Check ref
        if (!s.ref) {
          throw new Error(`${path} pointer missing ref`);
        }
        // Check if pointer exists
        if (!this.hasRecord(s.ref)) {
          throw new Error(`${path} pointer undefined`);
        }
        break;
      case 'array':
        this.verifyField(`${path}.items`, s.items);
        break;
      case 'union':
        s.union.forEach((t, i) => this.verifyField(`${path}.union[${i}]`, t));
        break;
      case 'map':
        this.verifyField(`${path}.values`, s.values);
        break;
      default:
        break;
    }
  }

  /**
   * Add record
   * @param record
   * @returns record name
   */
  addRecord(record: RecordDefinition): string {
    this.validateLock();

    // As pointer to record store
    if (typeof record === 'string') {
      // Record input is string
      if (this.records[record]) return record;
      else throw new Error(`Record ${record} is not exists`);
    }

    // As decorator
    else if (typeof record === 'function') {
      const def = getRecordData(record);
      if (!def) throw new Error(`'${record}' is not a record`);

      // Avoid duplicate define by decorator
      const recordClass = this.recordClasses[def.name];
      if (recordClass) {
        // Check if two defs is one
        if (recordClass !== record) {
          throw new Error(`Record '${def.name}' definition is duplicated`);
        }

        return def.name;
      } else {
        // Verify
        this.verifyRecord(def.name, { type: 'record', ...def }, true);
        // Add record
        this.recordClasses[def.name] = record;
        this.records[def.name] = def;

        return def.name;
      }
    }

    // As schema definition
    else {
      if (this.records[record.name]) {
        throw new Error(`Record '${record.name}' defined is duplicated`);
      }

      // Verify
      this.verifyRecord(record.name, { type: 'record', ...record }, true);
      // Add record
      this.records[record.name] = record as NamedRecordType;

      return record.name;
    }
  }

  /**
   * Check if record exists
   * @param name
   * @returns
   */
  hasRecord(name: string): boolean {
    return this.records[name] ? true : false;
  }

  /**
   * Get a record schema by name
   * @param name
   * @returns
   */
  getRecord(name: string): NamedRecordType {
    return this.records[name];
  }

  /**
   * Add receiver into schema
   * @param receiver
   */
  addReceiver(namespace: string, receiver: Receiver) {
    this.validateLock();
    const { name } = receiver;

    // Validate duplicated
    if (this.receivers[namespace]?.[name]) {
      throw new Error(`Receiver ${name} define duplicated`);
    }

    // Validate record
    if (receiver.type === 'query') {
      this.validateRecord(receiver.input, `Method ${name} input`);
      this.validateRecord(receiver.output, `Method ${name} output`);
    } else if (receiver.type === 'command') {
      this.validateRecord(receiver.record, `Command ${name}`);
    } else {
      throw new Error(`Unknown receiver type`);
    }

    if (this.receivers[namespace]) this.receivers[namespace][name] = receiver;
    else this.receivers[namespace] = { [name]: receiver };
  }
}
