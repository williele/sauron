import { getRecordData } from './decorators';
import {
  CommandReceiver,
  Receiver,
  MethodReceiver,
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

  private readonly signals: string[] = [];

  private readonly methods: Record<string, MethodReceiver> = {};
  private readonly commands: Record<string, CommandReceiver> = {};

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
      receivers: [
        ...Object.values(this.methods),
        ...Object.values(this.commands),
      ],
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
    schema.receivers.forEach((receiver) => result.addReceiver(receiver));
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

  /**
   * Add receiver into schema
   * @param receiver
   */
  addReceiver(receiver: Receiver) {
    this.validateLock();
    const { name } = receiver;

    if (receiver.type === 'method') {
      // Validate method
      if (this.methods[name]) {
        throw new Error(`Receiver method ${name} define duplicated`);
      }

      this.validateRecord(receiver.input, `Method ${name} input`);
      this.validateRecord(receiver.output, `Method ${name} output`);

      this.methods[name] = receiver;
    } else if (receiver.type === 'command') {
      // Validate command
      if (this.commands[name]) {
        throw new Error(`Receiver command ${name} define duplicated`);
      }

      this.validateRecord(receiver.record, `Command ${name}`);

      this.commands[name] = receiver;
    } else {
      throw new Error(`Unknown receiver type`);
    }
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
        // Add signal record
        if (def.signal === true) this.signals.push(def.name);

        return def.name;
      }
    }

    // As schema definition
    else {
      if (this.records[record.name]) {
        throw new Error(`Record '${record.name}' defined is duplicated`);
      }

      this.records[record.name] = record as NamedRecordType;
      // Add signal record
      if (record.signal === true) this.signals.push(record.name);

      return record.name;
    }
  }
}
