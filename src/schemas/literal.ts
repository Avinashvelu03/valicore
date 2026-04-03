import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

export type LiteralValue = string | number | boolean | null | undefined | bigint;

export class LiteralSchema<T extends LiteralValue> extends Schema<T> {
  readonly value: T;
  readonly _message?: string;

  constructor(value: T, message?: string) {
    super();
    this.value = value;
    this._message = message;
  }

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T> {
    if (input !== this.value) {
      return fail([{
        code: "invalid_literal",
        path: [...ctx.path],
        message: this._message ?? `Expected ${JSON.stringify(this.value)}, received ${JSON.stringify(input)}`,
        expected: String(this.value),
        received: getTypeName(input),
      }]);
    }
    return ok(input as T);
  }
}

export function literal<T extends LiteralValue>(value: T, message?: string): LiteralSchema<T> {
  return new LiteralSchema(value, message);
}
