import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

type DateCheck =
  | { kind: "min"; value: Date; message?: string }
  | { kind: "max"; value: Date; message?: string }
  | { kind: "past"; message?: string }
  | { kind: "future"; message?: string };

export class DateSchema extends Schema<Date> {
  _checks: DateCheck[] = [];

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<Date> {
    if (!(input instanceof Date)) {
      return fail([
        {
          code: "invalid_type",
          path: [...ctx.path],
          message: `Expected Date, received ${getTypeName(input)}`,
          expected: "date",
          received: getTypeName(input),
        },
      ]);
    }

    if (isNaN(input.getTime())) {
      return fail([
        {
          code: "invalid_date",
          path: [...ctx.path],
          message: "Invalid date",
        },
      ]);
    }

    const errors: ReturnType<typeof fail>["errors"] = [];

    for (const check of this._checks) {
      switch (check.kind) {
        case "min":
          if (input < check.value) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message:
                check.message ??
                `Date must be on or after ${check.value.toISOString()}`,
            });
          }
          break;
        case "max":
          if (input > check.value) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message:
                check.message ??
                `Date must be on or before ${check.value.toISOString()}`,
            });
          }
          break;
        case "past":
          if (input >= new Date()) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message: check.message ?? "Date must be in the past",
            });
          }
          break;
        case "future":
          if (input <= new Date()) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? "Date must be in the future",
            });
          }
          break;
      }
    }

    if (errors.length > 0) return fail(errors);
    return ok(input);
  }

  _addCheck(check: DateCheck): this {
    const clone = this._clone();
    (clone as DateSchema)._checks = [...this._checks, check];
    return clone;
  }

  min(value: Date, message?: string): this {
    return this._addCheck({ kind: "min", value, message });
  }

  max(value: Date, message?: string): this {
    return this._addCheck({ kind: "max", value, message });
  }

  past(message?: string): this {
    return this._addCheck({ kind: "past", message });
  }

  future(message?: string): this {
    return this._addCheck({ kind: "future", message });
  }

  between(min: Date, max: Date, message?: string): this {
    return this.min(min, message).max(max, message);
  }
}

export function date(): DateSchema {
  return new DateSchema();
}
