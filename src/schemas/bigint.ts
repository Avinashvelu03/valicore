import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

type BigIntCheck =
  | { kind: "min"; value: bigint; message?: string }
  | { kind: "max"; value: bigint; message?: string }
  | { kind: "positive"; message?: string }
  | { kind: "negative"; message?: string }
  | { kind: "nonnegative"; message?: string }
  | { kind: "nonpositive"; message?: string }
  | { kind: "multipleOf"; value: bigint; message?: string };

export class BigIntSchema extends Schema<bigint> {
  _checks: BigIntCheck[] = [];

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<bigint> {
    if (typeof input !== "bigint") {
      return fail([
        {
          code: "invalid_type",
          path: [...ctx.path],
          message: `Expected bigint, received ${getTypeName(input)}`,
          expected: "bigint",
          received: getTypeName(input),
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
                `BigInt must be greater than or equal to ${check.value}`,
              minimum: check.value,
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
                `BigInt must be less than or equal to ${check.value}`,
              maximum: check.value,
            });
          }
          break;
        case "positive":
          if (input <= 0n) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? "BigInt must be positive",
              minimum: 1n,
            });
          }
          break;
        case "negative":
          if (input >= 0n) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message: check.message ?? "BigInt must be negative",
              maximum: -1n,
            });
          }
          break;
        case "nonnegative":
          if (input < 0n) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? "BigInt must be non-negative",
              minimum: 0n,
            });
          }
          break;
        case "nonpositive":
          if (input > 0n) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message: check.message ?? "BigInt must be non-positive",
              maximum: 0n,
            });
          }
          break;
        case "multipleOf":
          if (input % check.value !== 0n) {
            errors.push({
              code: "not_multiple_of",
              path: [...ctx.path],
              message:
                check.message ??
                `BigInt must be a multiple of ${check.value}`,
            });
          }
          break;
      }
    }

    if (errors.length > 0) return fail(errors);
    return ok(input);
  }

  _addCheck(check: BigIntCheck): this {
    const clone = this._clone();
    (clone as BigIntSchema)._checks = [...this._checks, check];
    return clone;
  }

  min(value: bigint, message?: string): this {
    return this._addCheck({ kind: "min", value, message });
  }

  max(value: bigint, message?: string): this {
    return this._addCheck({ kind: "max", value, message });
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

  multipleOf(value: bigint, message?: string): this {
    return this._addCheck({ kind: "multipleOf", value, message });
  }
}

export function bigint(): BigIntSchema {
  return new BigIntSchema();
}
