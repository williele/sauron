import { ArrayField, Field, Record } from './decorators';
import { Schema } from './schema';

describe('Schema', () => {
  describe('add record', () => {
    let schema: Schema;
    beforeEach(() => {
      schema = new Schema('test', 'arvo');
    });

    it('should add', () => {
      expect(schema.hasRecord('Bar')).toBeFalsy();

      expect(
        schema.addRecord({
          name: 'Foo',
          fields: {
            name: { order: 1, type: 'string' },
          },
        })
      ).toBe('Foo');
      expect(schema.hasRecord('Foo')).toBeTruthy();

      @Record()
      class Bar {
        @Field(1, 'int') age: number;
      }
      expect(schema.addRecord(Bar)).toBe('Bar');
      expect(schema.hasRecord('Bar')).toBeTruthy();

      expect(schema.addRecord('Bar')).toBe('Bar');
    });

    it('should add with collection type', () => {
      @Record()
      class Foo {
        @ArrayField(1, 'string') tags: string[];
        @Field(2, {
          type: 'record',
          fields: {
            name: { order: 1, type: 'string' },
            age: { order: 2, type: 'int' },
          },
        })
        users: {
          name: string;
          age: number;
        };
        @Field(3, { type: 'union', union: ['string', 'int'] })
        refId: string | number;
        @Field(4, { type: 'map', values: 'string' })
        header: Record<string, string>;
      }

      expect(schema.addRecord(Foo)).toBe('Foo');
    });

    it('should add with pointer', () => {
      @Record()
      class Bar {
        @Field(1, 'string') name: string;
      }

      @Record()
      class Baz {
        @Field(1, 'int') age: number;
      }
      schema.addRecord(Baz);

      @Record()
      class Doe {}

      @Record()
      class Joe {}

      @Record()
      class Aoe {}
      @Record()
      class Boe {}

      @Record()
      class Foo {
        @Field(1, Bar) bar: Bar;
        @Field(2, { type: 'pointer', ref: 'Baz' }) baz: Baz;
        @Field(3, {
          type: 'array',
          items: { type: 'pointer', $ref: Doe },
        })
        does: Doe[];
        @Field(4, {
          type: 'map',
          values: { type: 'pointer', $ref: Joe },
        })
        joe: Record<string, Joe>;

        @Field(5, {
          type: 'union',
          union: [
            { type: 'pointer', $ref: Aoe },
            { type: 'pointer', $ref: Boe },
          ],
        })
        aboe: Aoe | Boe;
      }

      expect(schema.addRecord(Foo)).toBe('Foo');
      expect(schema.hasRecord('Foo')).toBeTruthy();
      expect(schema.hasRecord('Bar')).toBeTruthy();
      expect(schema.hasRecord('Doe')).toBeTruthy();
      expect(schema.hasRecord('Joe')).toBeTruthy();
      expect(schema.hasRecord('Aoe')).toBeTruthy();
      expect(schema.hasRecord('Boe')).toBeTruthy();
    });
  });
});
