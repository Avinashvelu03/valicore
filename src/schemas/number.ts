import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

type NumberCheck =
  | { kind: "min"; value: number; inclusive: boolean; message?: string }
  | { kind: "max"; value: number; inclusive: boolean; message?: string }
  | { kind: "int"; message?: string }
  | { kind: "positive"; message?: string }
  | { kind: "negative"; message?: string }
  | { kind: "nonnegative"; message?: string }
  | { kind: "nonpositive"; message?: string }
  | { kind: "finite"; message?: string }
  | { kind: "safe"; message?: string }
  | { kind: "multipleOf"; value: number; message?: string }
  | { kind: "port"; message?: string };

export class NumberSchema extends Schema<number> {
  _checks: NumberCheck[] = [];

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<number> {
    if (typeof input !== "number" || isNaN(input)) {
      return fail([
        {
          code: "invalid_type",
          path: [...ctx.path],
          message: `Expected number, received ${getTypeName(input)}`,
          expected: "number",
          received: getTypeName(input),
        },
      ]);
    }

    const errors: ReturnType<typeof fail>["errors"] = [];

    for (const check of this._checks) {
      switch (check.kind) {
        case "min":
          if (check.inclusive ? input < check.value : input <= check.value) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message:
                check.message ??
                `Number must be ${check.inclusive ? "greater than or equal to" : "greater than"} ${check.value}`,
              minimum: check.value,
            });
          }
          break;
        case "max":
          if (check.inclusive ? input > check.value : input >= check.value) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message:
                check.message ??
                `Number must be ${check.inclusive ? "less than or equal to" : "less than"} ${check.value}`,
              maximum: check.value,
            });
          }
          break;
        case "int":
          if (!Number.isInteger(input)) {
            errors.push({
              code: "invalid_type",
              path: [...ctx.path],
              message: check.message ?? "Expected integer, received float",
            });
          }
          break;
        case "positive":
          if (input <= 0) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? "Number must be positive",
              minimum: 0,
            });
          }
          break;
        case "negative":
          if (input >= 0) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message: check.message ?? "Number must be negative",
              maximum: 0,
            });
          }
          break;
        case "nonnegative":
          if (input < 0) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? "Number must be non-negative",
              minimum: 0,
            });
          }
          break;
        case "nonpositive":
          if (input > 0) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message: check.message ?? "Number must be non-positive",
              maximum: 0,
            });
          }
          break;
        case "finite":
          if (!isFinite(input)) {
            errors.push({
              code: "not_finite",
              path: [...ctx.path],
              message: check.message ?? "Number must be finite",
            });
          }
          break;
        case "safe":
          if (!Number.isSafeInteger(input)) {
            errors.push({
              code: "invalid_type",
              path: [...ctx.path],
              message: check.message ?? "Number must be a safe integer",
            });
          }
          break;
        case "multipleOf":
          if (input % check.value !== 0) {
            errors.push({
              code: "not_multiple_of",
              path: [...ctx.path],
              message:
                check.message ?? `Number must be a multiple of ${check.value}`,
            });
          }
          break;
        case "port":
          if (!Number.isInteger(input) || input < 0 || input > 65535) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message: check.message ?? "Number must be a valid port (0-65535)",
            });
          }
          break;
      }
    }

    if (errors.length > 0) return fail(errors);
    return ok(input);
  }

  _addCheck(check: NumberCheck): this {
    const clone = this._clone();
    (clone as NumberSchema)._checks = [...this._checks, check];
    return clone;
  }

  min(value: number, message?: string): this {
    return this._addCheck({ kind: "min", value, inclusive: true, message });
  }

  max(value: number, message?: string): this {
    return this._addCheck({ kind: "max", value, inclusive: true, message });
  }

  gt(value: number, message?: string): this {
    return this._addCheck({ kind: "min", value, inclusive: false, message });
  }

  lt(value: number, message?: string): this {
    return this._addCheck({ kind: "max", value, inclusive: false, message });
  }

  gte(value: number, message?: string): this {
    return this.min(value, message);
  }

  lte(value: number, message?: string): this {
    return this.max(value, message);
  }

  int(message?: string): this {
    return this._addCheck({ kind: "int", message });
  }

  positive(message?: string): this {
    return this._addCheck({ kind: "positive", message });
  }

  negative(message?: string): this {
    return this._addCheck({ kind: "negative", message });
  }

  nonnegative(message?: string): this {
    return this._addCheck({ kind: "nonnegative", message });
  }

  nonpositive(message?: string): this {
    return this._addCheck({ kind: "nonpositive", message });
  }

  finite(message?: string): this {
    return this._addCheck({ kind: "finite", message });
  }

  safe(message?: string): this {
    return this._addCheck({ kind: "safe", message });
  }

  multipleOf(value: number, message?: string): this {
    return this._addCheck({ kind: "multipleOf", value, message });
  }

  step(value: number, message?: string): this {
    return this.multipleOf(value, message);
  }

  between(min: number, max: number, message?: string): this {
    return this.min(min, message).max(max, message);
  }

  port(message?: string): this {
    return this._addCheck({ kind: "port", message });
  }
}

export function number(): NumberSchema {
  return new NumberSchema();
}
