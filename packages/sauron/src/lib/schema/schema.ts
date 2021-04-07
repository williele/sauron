import { getRecordData } from './decorators';
import {
  Receiver,
  NamedRecordType,
  ServiceSchema,
  RecordDefinition,
} from './interface';

/**
 * Schema of a service
 * Store records, methods, commands, signals
 */
export class Schema {
  private readonly lock = false;

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
    if (this.lock) {
      throw new Error(`Schema already lock cannot modify`);
    }
  }

  private verifyRecord() {
    //
  }

  private verifyField() {
    //
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
    if (receiver.type === 'method') {
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

  /**
   * Add record
   * @param record
   * @returns
   */
  addRecord(record: RecordDefinition) {
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

      const recordClass = this.recordClasses[def.name];
      if (recordClass) {
        // Check if two defs is one
        if (recordClass !== record) {
          throw new Error(`Record '${def.name}' definition is duplicated`);
        }

        return def.name;
      } else {
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

      this.records[record.name] = record as NamedRecordType;

      return record.name;
    }
  }
}
