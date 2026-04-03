import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

export class BooleanSchema extends Schema<boolean> {
  _trueOnly = false;
  _falseOnly = false;
  _coerce = false;

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<boolean> {
    let value: unknown = input;

    if (this._coerce) {
      value = Boolean(input);
    }

    if (typeof value !== "boolean") {
      return fail([
        {
          code: "invalid_type",
          path: [...ctx.path],
          message: `Expected boolean, received ${getTypeName(input)}`,
          expected: "boolean",
          received: getTypeName(input),
        },
      ]);
    }

    if (this._trueOnly && value !== true) {
      return fail([
        {
          code: "invalid_value",
          path: [...ctx.path],
          message: "Expected true",
          expected: "true",
        },
      ]);
    }

    if (this._falseOnly && value !== false) {
      return fail([
        {
          code: "invalid_value",
          path: [...ctx.path],
          message: "Expected false",
          expected: "false",
        },
      ]);
    }

    return ok(value);
  }

  true(): this {
    const clone = this._clone();
    (clone as BooleanSchema)._trueOnly = true;
    (clone as BooleanSchema)._falseOnly = false;
    return clone;
  }

  false(): this {
    const clone = this._clone();
    (clone as BooleanSchema)._falseOnly = true;
    (clone as BooleanSchema)._trueOnly = false;
    return clone;
  }

  coerce(): this {
    const clone = this._clone();
    (clone as BooleanSchema)._coerce = true;
    return clone;
  }
}

export function boolean(): BooleanSchema {
  return new BooleanSchema();
}
