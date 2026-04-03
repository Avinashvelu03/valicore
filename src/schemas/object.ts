/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, isOk, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";
import type { AnySchema } from "../core/types.js";

type UnknownKeysParam = "strip" | "strict" | "passthrough";
export type SchemaShape = Record<string, AnySchema>;
export type InferShape<T extends SchemaShape> = { [K in keyof T]: T[K]["_output"] };

export class ObjectSchema<T extends SchemaShape> extends Schema<InferShape<T>> {
  readonly shape: T;
  _unknownKeys: UnknownKeysParam = "strip";

  constructor(shape: T) {
    super();
    this.shape = shape;
  }

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<InferShape<T>> | Promise<ParseResult<InferShape<T>>> {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return fail([{ code: "invalid_type", path: [...ctx.path], message: `Expected object, received ${getTypeName(input)}`, expected: "object", received: getTypeName(input) }]);
    }

    const obj = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const errors: ReturnType<typeof fail>["errors"] = [];
    let hasAsync = false;
    const promises: Promise<void>[] = [];

    if (this._unknownKeys === "strict") {
      const extraKeys = Object.keys(obj).filter((k) => !Object.prototype.hasOwnProperty.call(this.shape, k));
      if (extraKeys.length > 0) {
        errors.push({ code: "unrecognized_keys", path: [...ctx.path], message: `Unrecognized key(s): ${extraKeys.map((k) => `"${k}"`).join(", ")}`, keys: extraKeys });
      }
    }

    for (const key of Object.keys(this.shape)) {
      const schema = this.shape[key] as AnySchema;
      const fieldCtx: ParseCtx = { path: [...ctx.path, key], async: ctx.async };
      const value = Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
      const res = schema._parse(value, fieldCtx);

      if (res instanceof Promise) {
        hasAsync = true;
        promises.push(res.then((r) => { if (isOk(r)) result[key] = r.data; else errors.push(...r.errors); }));
      } else {
        if (isOk(res)) result[key] = res.data;
        else errors.push(...res.errors);
      }
    }

    if (this._unknownKeys === "passthrough") {
      for (const key of Object.keys(obj)) {
        if (!Object.prototype.hasOwnProperty.call(this.shape, key)) result[key] = obj[key];
      }
    }

    if (hasAsync) {
      return Promise.all(promises).then(() => errors.length > 0 ? fail(errors) : ok(result as InferShape<T>));
    }
    if (errors.length > 0) return fail(errors);
    return ok(result as InferShape<T>);
  }

  strict(): this { const c = this._clone(); (c as any)._unknownKeys = "strict"; return c; }
  strip(): this { const c = this._clone(); (c as any)._unknownKeys = "strip"; return c; }
  passthrough(): this { const c = this._clone(); (c as any)._unknownKeys = "passthrough"; return c; }

  partial(): ObjectSchema<any> {
    const newShape = {} as any;
    for (const key of Object.keys(this.shape) as (keyof T)[]) {
      newShape[key as string] = (this.shape[key] as AnySchema).optional();
    }
    return new ObjectSchema(newShape);
  }

  required(): ObjectSchema<T> {
    return new ObjectSchema(this.shape);
  }

  pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>> {
    const newShape = {} as Pick<T, K>;
    for (const key of keys) (newShape as any)[key as string] = this.shape[key];
    return new ObjectSchema(newShape);
  }

  omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>> {
    const newShape = {} as Omit<T, K>;
    for (const key of Object.keys(this.shape) as (keyof T)[]) {
      if (!keys.includes(key as K)) (newShape as any)[key as string] = this.shape[key];
    }
    return new ObjectSchema(newShape);
  }

  extend<U extends SchemaShape>(shape: U): ObjectSchema<T & U> {
    return new ObjectSchema({ ...this.shape, ...shape });
  }

  merge<U extends SchemaShape>(schema: ObjectSchema<U>): ObjectSchema<T & U> {
    return this.extend(schema.shape);
  }

  keyof(): any {
    // Returns the keys of the object shape as an array
    return Object.keys(this.shape);
  }

  deepPartial(): ObjectSchema<any> {
    const newShape: SchemaShape = {};
    for (const key of Object.keys(this.shape)) {
      const fieldSchema = this.shape[key] as AnySchema;
      if (fieldSchema instanceof ObjectSchema) {
        newShape[key] = (fieldSchema as ObjectSchema<any>).deepPartial().optional() as any;
      } else {
        newShape[key] = fieldSchema.optional() as any;
      }
    }
    return new ObjectSchema(newShape);
  }
}

export function object<T extends SchemaShape>(shape: T): ObjectSchema<T> {
  return new ObjectSchema(shape);
}
