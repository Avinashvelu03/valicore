import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, isOk, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";
import type { AnySchema } from "../core/types.js";

type ArrayCheck =
  | { kind: "min"; value: number; message?: string }
  | { kind: "max"; value: number; message?: string }
  | { kind: "length"; value: number; message?: string }
  | { kind: "nonempty"; message?: string }
  | { kind: "unique"; message?: string };

export class ArraySchema<T extends AnySchema> extends Schema<T["_output"][]> {
  readonly element: T;
  _checks: ArrayCheck[] = [];

  constructor(element: T) {
    super();
    this.element = element;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<T["_output"][]> | Promise<ParseResult<T["_output"][]>> {
    if (!Array.isArray(input)) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected array, received ${getTypeName(input)}`,
        expected: "array",
        received: getTypeName(input),
      }]);
    }

    const errors: ReturnType<typeof fail>["errors"] = [];

    // Run checks on the array itself first
    for (const check of this._checks) {
      switch (check.kind) {
        case "min":
          if (input.length < check.value) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? `Array must contain at least ${check.value} element(s)`,
              minimum: check.value,
            });
          }
          break;
        case "max":
          if (input.length > check.value) {
            errors.push({
              code: "too_big",
              path: [...ctx.path],
              message: check.message ?? `Array must contain at most ${check.value} element(s)`,
              maximum: check.value,
            });
          }
          break;
        case "length":
          if (input.length !== check.value) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? `Array must contain exactly ${check.value} element(s)`,
              minimum: check.value,
              maximum: check.value,
            });
          }
          break;
        case "nonempty":
          if (input.length === 0) {
            errors.push({
              code: "too_small",
              path: [...ctx.path],
              message: check.message ?? "Array must not be empty",
              minimum: 1,
            });
          }
          break;
        case "unique":
          {
            const seen = new Set<string>();
            for (const item of input) {
              const key = JSON.stringify(item);
              if (seen.has(key)) {
                errors.push({
                  code: "not_unique",
                  path: [...ctx.path],
                  message: check.message ?? "Array must contain unique values",
                });
                break;
              }
              seen.add(key);
            }
          }
          break;
      }
    }

    if (errors.length > 0) return fail(errors);

    // Parse each element
    const results: T["_output"][] = [];
    let hasAsync = false;
    const promises: Promise<void>[] = [];
    const elementErrors: ReturnType<typeof fail>["errors"] = [];

    for (let i = 0; i < input.length; i++) {
      const elemCtx: ParseCtx = { path: [...ctx.path, i], async: ctx.async };
      const res = this.element._parse(input[i], elemCtx);

      if (res instanceof Promise) {
        hasAsync = true;
        const idx = i;
        results.push(undefined as T["_output"]);
        promises.push(
          res.then((r) => {
            if (isOk(r)) {
              results[idx] = r.data;
            } else {
              elementErrors.push(...r.errors);
            }
          })
        );
      } else {
        if (isOk(res)) {
          results.push(res.data);
        } else {
          elementErrors.push(...res.errors);
        }
      }
    }

    if (hasAsync) {
      return Promise.all(promises).then(() => {
        if (elementErrors.length > 0) return fail(elementErrors);
        return ok(results);
      });
    }

    if (elementErrors.length > 0) return fail(elementErrors);
    return ok(results);
  }

  _addCheck(check: ArrayCheck): this {
    const clone = this._clone();
    (clone as ArraySchema<T>)._checks = [...this._checks, check];
    return clone;
  }

  min(value: number, message?: string): this {
    return this._addCheck({ kind: "min", value, message });
  }

  max(value: number, message?: string): this {
    return this._addCheck({ kind: "max", value, message });
  }

  length(value: number, message?: string): this {
    return this._addCheck({ kind: "length", value, message });
  }

  nonempty(message?: string): this {
    return this._addCheck({ kind: "nonempty", message });
  }

  unique(message?: string): this {
    return this._addCheck({ kind: "unique", message });
  }
}

export function array<T extends AnySchema>(element: T): ArraySchema<T> {
  return new ArraySchema(element);
}
