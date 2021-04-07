export abstract class BaseTransporter {
  abstract request(subject: string, payload: Buffer): Promise<Buffer>;
  abstract reply(subject: string, payload: Buffer): Promise<void>;
}
