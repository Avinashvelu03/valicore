import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, isOk, type ParseResult } from "../core/result.js";
import { getTypeName, type ValiIssue } from "../core/errors.js";
import type { AnySchema, Infer } from "../core/types.js";

// ─── Tuple ───────────────────────────────────────────────────────────────────

type TupleItems = readonly AnySchema[];
type TupleOutput<T extends TupleItems> = {
  [K in keyof T]: T[K] extends AnySchema ? Infer<T[K]> : never;
};

export class TupleSchema<T extends TupleItems> extends Schema<TupleOutput<T>> {
  readonly items: T;

  constructor(items: T) {
    super();
    this.items = items;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<TupleOutput<T>> | Promise<ParseResult<TupleOutput<T>>> {
    if (!Array.isArray(input)) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected tuple (array), received ${getTypeName(input)}`,
        expected: "array",
        received: getTypeName(input),
      }]);
    }

    if (input.length !== this.items.length) {
      return fail([{
        code: "too_small",
        path: [...ctx.path],
        message: `Expected tuple of length ${this.items.length}, received length ${input.length}`,
        minimum: this.items.length,
        maximum: this.items.length,
      }]);
    }

    const result: unknown[] = [];
    const errors: ValiIssue[] = [];
    let hasAsync = false;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const schema = this.items[i] as AnySchema;
      const elemCtx: ParseCtx = { path: [...ctx.path, i], async: ctx.async };
      const res = schema._parse(input[i], elemCtx);

      if (res instanceof Promise) {
        hasAsync = true;
        const idx = i;
        result.push(undefined);
        promises.push(res.then((r) => {
          if (isOk(r)) result[idx] = r.data;
          else errors.push(...r.errors);
        }));
      } else {
        if (isOk(res)) result.push(res.data);
        else errors.push(...res.errors);
      }
    }

    if (hasAsync) {
      return Promise.all(promises).then(() =>
        errors.length > 0 ? fail(errors) : ok(result as TupleOutput<T>)
      );
    }

    if (errors.length > 0) return fail(errors);
    return ok(result as TupleOutput<T>);
  }
}

export function tuple<T extends TupleItems>(items: T): TupleSchema<T> {
  return new TupleSchema(items);
}

// ─── Union ───────────────────────────────────────────────────────────────────

type UnionOptions = readonly [AnySchema, AnySchema, ...AnySchema[]];
type UnionOutput<T extends UnionOptions> = Infer<T[number]>;

export class UnionSchema<T extends UnionOptions> extends Schema<UnionOutput<T>> {
  readonly options: T;

  constructor(options: T) {
    super();
    this.options = options;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<UnionOutput<T>> | Promise<ParseResult<UnionOutput<T>>> {
    const errors: ValiIssue[][] = [];

    for (const schema of this.options) {
      const res = schema._parse(input, { ...ctx, path: [...ctx.path] });
      if (res instanceof Promise) {
        // async union
        return this._parseAsync(input, ctx);
      }
      if (isOk(res)) {
        return ok(res.data as UnionOutput<T>);
      }
      errors.push(res.errors);
    }

    return fail([{
      code: "invalid_union",
      path: [...ctx.path],
      message: "Invalid union value",
      unionErrors: errors,
    }]);
  }

  private async _parseAsync(
    input: unknown,
    ctx: ParseCtx
  ): Promise<ParseResult<UnionOutput<T>>> {
    const errors: ValiIssue[][] = [];

    for (const schema of this.options) {
      const res = await Promise.resolve(schema._parse(input, { ...ctx }));
      if (isOk(res)) return ok(res.data as UnionOutput<T>);
      errors.push(res.errors);
    }

    return fail([{
      code: "invalid_union",
      path: [...ctx.path],
      message: "Invalid union value",
      unionErrors: errors,
    }]);
  }
}

export function union<T extends UnionOptions>(options: T): UnionSchema<T> {
  return new UnionSchema(options);
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

type DiscriminatedUnionOption<K extends string> = AnySchema & {
  shape: Record<K, AnySchema>;
};

export class DiscriminatedUnionSchema<
  K extends string,
  T extends DiscriminatedUnionOption<K>
> extends Schema<Infer<T>> {
  readonly discriminator: K;
  readonly options: T[];
  private readonly _optionMap: Map<unknown, T>;

  constructor(discriminator: K, options: T[]) {
    super();
    this.discriminator = discriminator;
    this.options = options;
    this._optionMap = new Map();

    for (const option of options) {
      const discSchema = option.shape[discriminator];
      if (discSchema) {
        // Extract the literal value from the schema
        const testResult = (discSchema as AnySchema)._parse(undefined, { path: [], async: false });
        if (!(testResult instanceof Promise) && !isOk(testResult)) {
          // Try common literal values - we'll store the option by parsing sample values
          // Better: access the literal value directly if it's a LiteralSchema
          const s = discSchema as { value?: unknown };
          if (s.value !== undefined) {
            this._optionMap.set(s.value, option);
          }
        }
      }
    }
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<Infer<T>> | Promise<ParseResult<Infer<T>>> {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected object, received ${getTypeName(input)}`,
        expected: "object",
        received: getTypeName(input),
      }]);
    }

    const obj = input as Record<string, unknown>;
    const discriminatorValue = obj[this.discriminator];

    // Try the map first for O(1) lookup
    const matchedOption = this._optionMap.get(discriminatorValue);
    if (matchedOption) {
      return matchedOption._parse(input, ctx) as ParseResult<Infer<T>>;
    }

    // Fall back to scanning options
    const errors: ValiIssue[][] = [];
    for (const option of this.options) {
      const res = option._parse(input, ctx);
      if (res instanceof Promise) {
        return res.then((r) => {
          if (isOk(r)) return r as ParseResult<Infer<T>>;
          errors.push(r.errors);
          return fail([{
            code: "invalid_union_discriminator",
            path: [...ctx.path, this.discriminator],
            message: `Invalid discriminator value: ${JSON.stringify(discriminatorValue)}`,
            unionErrors: errors,
          }]);
        });
      }
      if (isOk(res)) return res as ParseResult<Infer<T>>;
      errors.push(res.errors);
    }

    return fail([{
      code: "invalid_union_discriminator",
      path: [...ctx.path, this.discriminator],
      message: `Invalid discriminator value: ${JSON.stringify(discriminatorValue)}`,
      unionErrors: errors,
    }]);
  }
}

export function discriminatedUnion<
  K extends string,
  T extends DiscriminatedUnionOption<K>
>(discriminator: K, options: T[]): DiscriminatedUnionSchema<K, T> {
  return new DiscriminatedUnionSchema(discriminator, options);
}

// ─── Intersection ─────────────────────────────────────────────────────────────

export class IntersectionSchema<A extends AnySchema, B extends AnySchema> extends Schema<
  Infer<A> & Infer<B>
> {
  readonly _left: A;
  readonly _right: B;

  constructor(left: A, right: B) {
    super();
    this._left = left;
    this._right = right;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<Infer<A> & Infer<B>> | Promise<ParseResult<Infer<A> & Infer<B>>> {
    const leftRes = this._left._parse(input, ctx);
    const rightRes = this._right._parse(input, ctx);

    const merge = (
      l: ParseResult<Infer<A>>,
      r: ParseResult<Infer<B>>
    ): ParseResult<Infer<A> & Infer<B>> => {
      if (!isOk(l) && !isOk(r)) return fail([...l.errors, ...r.errors]);
      if (!isOk(l)) return fail(l.errors);
      if (!isOk(r)) return fail(r.errors);

      // Merge results
      const lData = l.data;
      const rData = r.data;

      if (
        lData !== null &&
        rData !== null &&
        typeof lData === "object" &&
        typeof rData === "object"
      ) {
        return ok({ ...lData, ...rData } as Infer<A> & Infer<B>);
      }

      // For non-object types, they must be equal
      if (lData !== rData) {
        return fail([{
          code: "invalid_intersection_types",
          path: [...ctx.path],
          message: "Intersection types are not compatible",
        }]);
      }

      return ok(lData as Infer<A> & Infer<B>);
    };

    if (leftRes instanceof Promise || rightRes instanceof Promise) {
      return Promise.all([
        Promise.resolve(leftRes),
        Promise.resolve(rightRes),
      ]).then(([l, r]) => merge(l, r));
    }

    return merge(leftRes, rightRes);
  }
}

export function intersection<A extends AnySchema, B extends AnySchema>(
  left: A,
  right: B
): IntersectionSchema<A, B> {
  return new IntersectionSchema(left, right);
}
