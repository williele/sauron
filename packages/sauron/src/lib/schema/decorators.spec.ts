import { Record, Field, ArrayField, getRecordData } from './decorators';

describe('Schema decorators', () => {
  it('should define record correctly', () => {
    @Record({ name: 'Barr' })
    class Bar {
      @Field(1, 'string')
      name: string;

      @Field(2, { type: 'int', max: 50 })
      age: number;

      @Field(3, 'timestamp')
      createdAt: Date;
    }

    @Record()
    class Baz {}

    @Record()
    class Foo {
      @Field(1, Baz)
      baz: Baz;

      @ArrayField(2, Bar)
      bar: Bar;

      @ArrayField(3, 'float')
      numberList: number[];

      @ArrayField(4, { type: 'long', min: 10 })
      longList: number[];
    }

    const barSchema = getRecordData(Bar);
    expect(barSchema).toEqual({
      name: 'Barr',
      fields: {
        name: { order: 1, type: 'string' },
        age: { order: 2, type: 'int', max: 50 },
        createdAt: { order: 3, type: 'timestamp' },
      },
    });

    const bazSchema = getRecordData(Baz);
    expect(bazSchema).toEqual({
      name: 'Baz',
      fields: {},
    });

    const fooSchema = getRecordData(Foo);
    expect(fooSchema).toEqual({
      name: 'Foo',
      fields: {
        baz: { order: 1, type: 'pointer', pointer: 'Baz', ref: Baz },
        bar: {
          order: 2,
          type: 'array',
          items: { type: 'pointer', pointer: 'Barr', ref: Bar },
        },
        numberList: { order: 3, type: 'array', items: { type: 'float' } },
        longList: { order: 4, type: 'array', items: { type: 'long', min: 10 } },
      },
    });
  });

  it('should throw error if missing @Record decorator', () => {
    class Bar {}
    expect(() => {
      @Record()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class Foo {
        @Field(1, Bar) bar: Bar;
      }
    }).toThrow();

    expect(() => {
      @Record()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class Foo {
        @ArrayField(1, Bar) bars: Bar[];
      }
    }).toThrow();
  });
});
