import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

// ─── Enum ─────────────────────────────────────────────────────────────────────

export class EnumSchema<T extends string[]> extends Schema<T[number]> {
  readonly enum: T;
  readonly _message?: string;

  constructor(values: T, message?: string) {
    super();
    this.enum = values;
    this._message = message;
  }

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T[number]> {
    if (!this.enum.includes(input as string)) {
      return fail([{
        code: "invalid_enum_value",
        path: [...ctx.path],
        message:
          this._message ??
          `Invalid enum value. Expected ${this.enum.map((v) => `"${v}"`).join(" | ")}, received ${JSON.stringify(input)}`,
        received: getTypeName(input),
        expected: this.enum.join(" | "),
      }]);
    }
    return ok(input as T[number]);
  }

  extract<K extends T[number]>(values: K[]): EnumSchema<K[]> {
    return new EnumSchema(values);
  }

  exclude<K extends T[number]>(values: K[]): EnumSchema<Exclude<T[number], K>[]> {
    return new EnumSchema(
      this.enum.filter((v) => !values.includes(v as K)) as Exclude<T[number], K>[]
    );
  }
}

export function enumSchema<T extends string[]>(
  values: T,
  message?: string
): EnumSchema<T> {
  return new EnumSchema(values, message);
}

// ─── Native Enum ──────────────────────────────────────────────────────────────

type NativeEnumType = Record<string, string | number>;
type NativeEnumValue<T extends NativeEnumType> = T[keyof T];

export class NativeEnumSchema<T extends NativeEnumType> extends Schema<NativeEnumValue<T>> {
  readonly nativeEnum: T;
  readonly _message?: string;

  constructor(nativeEnum: T, message?: string) {
    super();
    this.nativeEnum = nativeEnum;
    this._message = message;
  }

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<NativeEnumValue<T>> {
    const values = Object.values(this.nativeEnum);
    if (!values.includes(input as string | number)) {
      return fail([{
        code: "invalid_enum_value",
        path: [...ctx.path],
        message:
          this._message ??
          `Invalid enum value. Expected one of: ${values.map((v) => JSON.stringify(v)).join(", ")}`,
        received: getTypeName(input),
      }]);
    }
    return ok(input as NativeEnumValue<T>);
  }
}

export function nativeEnum<T extends NativeEnumType>(
  nativeEnum: T,
  message?: string
): NativeEnumSchema<T> {
  return new NativeEnumSchema(nativeEnum, message);
}

// ─── Promise ──────────────────────────────────────────────────────────────────

export class PromiseSchema<T extends Schema<unknown>> extends Schema<Promise<T["_output"]>> {
  readonly _inner: T;

  constructor(inner: T) {
    super();
    this._inner = inner;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<Promise<T["_output"]>> {
    if (!(input instanceof Promise)) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected Promise, received ${getTypeName(input)}`,
        expected: "promise",
        received: getTypeName(input),
      }]);
    }
    // Return a validated promise
    const validatedPromise = input.then((value) => {
      return this._inner.parseAsync(value);
    });
    return ok(validatedPromise);
  }
}

export function promise<T extends Schema<unknown>>(inner: T): PromiseSchema<T> {
  return new PromiseSchema(inner);
}

// ─── Lazy ─────────────────────────────────────────────────────────────────────

export class LazySchema<T extends Schema<unknown>> extends Schema<T["_output"]> {
  private readonly _getter: () => T;
  _cached?: T;

  constructor(getter: () => T) {
    super();
    this._getter = getter;
  }

  get schema(): T {
    if (!this._cached) {
      this._cached = this._getter();
    }
    return this._cached;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<T["_output"]> | Promise<ParseResult<T["_output"]>> {
    return this.schema._parse(input, ctx) as ParseResult<T["_output"]>;
  }
}

export function lazy<T extends Schema<unknown>>(getter: () => T): LazySchema<T> {
  return new LazySchema(getter);
}

// ─── Custom ───────────────────────────────────────────────────────────────────

export class CustomSchema<T> extends Schema<T> {
  readonly _check: (input: unknown) => input is T;
  private readonly _message: string;

  constructor(check: (input: unknown) => input is T, message = "Invalid value") {
    super();
    this._check = check;
    this._message = message;
  }

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T> {
    if (!this._check(input)) {
      return fail([{
        code: "custom",
        path: [...ctx.path],
        message: this._message,
      }]);
    }
    return ok(input);
  }
}

export function custom<T>(
  check: (input: unknown) => input is T,
  message?: string
): CustomSchema<T> {
  return new CustomSchema(check, message);
}

// ─── Brand ────────────────────────────────────────────────────────────────────
// Brand is handled via Schema.brand() method in the base class

// ─── Preprocess ───────────────────────────────────────────────────────────────

export class PreprocessSchema<T extends Schema<unknown>> extends Schema<T["_output"]> {
  readonly _fn: (input: unknown) => unknown;
  readonly _inner: T;

  constructor(fn: (input: unknown) => unknown, inner: T) {
    super();
    this._fn = fn;
    this._inner = inner;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<T["_output"]> | Promise<ParseResult<T["_output"]>> {
    const processed = this._fn(input);
    return this._inner._parse(processed, ctx) as ParseResult<T["_output"]>;
  }
}

export function preprocess<T extends Schema<unknown>>(
  fn: (input: unknown) => unknown,
  schema: T
): PreprocessSchema<T> {
  return new PreprocessSchema(fn, schema);
}
