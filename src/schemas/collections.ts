import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, isOk, type ParseResult } from "../core/result.js";
import { getTypeName, type ValiIssue } from "../core/errors.js";
import type { AnySchema, Infer } from "../core/types.js";

// ─── Record ──────────────────────────────────────────────────────────────────

export class RecordSchema<
  K extends AnySchema,
  V extends AnySchema
> extends Schema<Record<string, Infer<V>>> {
  readonly keySchema: K;
  readonly valueSchema: V;

  constructor(keySchema: K, valueSchema: V) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<Record<string, Infer<V>>> | Promise<ParseResult<Record<string, Infer<V>>>> {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected record (object), received ${getTypeName(input)}`,
        expected: "object",
        received: getTypeName(input),
      }]);
    }

    const obj = input as Record<string, unknown>;
    const result: Record<string, Infer<V>> = {};
    const errors: ValiIssue[] = [];
    let hasAsync = false;
    const promises: Promise<void>[] = [];

    for (const key of Object.keys(obj)) {
      // Validate key
      const keyCtx: ParseCtx = { path: [...ctx.path], async: ctx.async };
      const keyRes = this.keySchema._parse(key, keyCtx);

      if (keyRes instanceof Promise) {
        hasAsync = true;
        promises.push(keyRes.then((kr) => {
          if (!isOk(kr)) {
            errors.push(...kr.errors);
            return;
          }
          const valCtx: ParseCtx = { path: [...ctx.path, key], async: ctx.async };
          return Promise.resolve(this.valueSchema._parse(obj[key], valCtx)).then((vr) => {
            if (isOk(vr)) result[key] = vr.data as Infer<V>;
            else errors.push(...vr.errors);
          });
        }));
      } else {
        if (!isOk(keyRes)) {
          errors.push(...keyRes.errors);
          continue;
        }
        const valCtx: ParseCtx = { path: [...ctx.path, key], async: ctx.async };
        const valRes = this.valueSchema._parse(obj[key], valCtx);
        if (valRes instanceof Promise) {
          hasAsync = true;
          promises.push(valRes.then((vr) => {
            if (isOk(vr)) result[key] = vr.data as Infer<V>;
            else errors.push(...vr.errors);
          }));
        } else {
          if (isOk(valRes)) result[key] = valRes.data as Infer<V>;
          else errors.push(...valRes.errors);
        }
      }
    }

    if (hasAsync) {
      return Promise.all(promises).then(() =>
        errors.length > 0 ? fail(errors) : ok(result)
      );
    }

    return errors.length > 0 ? fail(errors) : ok(result);
  }
}

export function record<K extends AnySchema, V extends AnySchema>(
  keySchema: K,
  valueSchema: V
): RecordSchema<K, V> {
  return new RecordSchema(keySchema, valueSchema);
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export class MapSchema<K extends AnySchema, V extends AnySchema> extends Schema<
  Map<Infer<K>, Infer<V>>
> {
  readonly keySchema: K;
  readonly valueSchema: V;

  constructor(keySchema: K, valueSchema: V) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<Map<Infer<K>, Infer<V>>> | Promise<ParseResult<Map<Infer<K>, Infer<V>>>> {
    if (!(input instanceof Map)) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected Map, received ${getTypeName(input)}`,
        expected: "map",
        received: getTypeName(input),
      }]);
    }

    const result = new Map<Infer<K>, Infer<V>>();
    const errors: ValiIssue[] = [];
    let hasAsync = false;
    const promises: Promise<void>[] = [];
    let idx = 0;

    for (const [k, v] of input) {
      const entryIdx = idx++;
      const keyCtx: ParseCtx = { path: [...ctx.path, entryIdx, "key"], async: ctx.async };
      const valCtx: ParseCtx = { path: [...ctx.path, entryIdx, "value"], async: ctx.async };
      const keyRes = this.keySchema._parse(k, keyCtx);
      const valRes = this.valueSchema._parse(v, valCtx);

      if (keyRes instanceof Promise || valRes instanceof Promise) {
        hasAsync = true;
        promises.push(
          Promise.all([Promise.resolve(keyRes), Promise.resolve(valRes)]).then(([kr, vr]) => {
            if (!isOk(kr)) errors.push(...kr.errors);
            if (!isOk(vr)) errors.push(...vr.errors);
            if (isOk(kr) && isOk(vr)) result.set(kr.data as Infer<K>, vr.data as Infer<V>);
          })
        );
      } else {
        if (!isOk(keyRes)) errors.push(...keyRes.errors);
        if (!isOk(valRes)) errors.push(...valRes.errors);
        if (isOk(keyRes) && isOk(valRes)) {
          result.set(keyRes.data as Infer<K>, valRes.data as Infer<V>);
        }
      }
    }

    if (hasAsync) {
      return Promise.all(promises).then(() =>
        errors.length > 0 ? fail(errors) : ok(result)
      );
    }

    return errors.length > 0 ? fail(errors) : ok(result);
  }
}

export function map<K extends AnySchema, V extends AnySchema>(
  keySchema: K,
  valueSchema: V
): MapSchema<K, V> {
  return new MapSchema(keySchema, valueSchema);
}

// ─── Set ─────────────────────────────────────────────────────────────────────

type SetCheck =
  | { kind: "min"; value: number; message?: string }
  | { kind: "max"; value: number; message?: string }
  | { kind: "size"; value: number; message?: string }
  | { kind: "nonempty"; message?: string };

export class SetSchema<T extends AnySchema> extends Schema<Set<Infer<T>>> {
  readonly valueSchema: T;
  _checks: SetCheck[] = [];

  constructor(valueSchema: T) {
    super();
    this.valueSchema = valueSchema;
  }

  _parseValue(
    input: unknown,
    ctx: ParseCtx
  ): ParseResult<Set<Infer<T>>> | Promise<ParseResult<Set<Infer<T>>>> {
    if (!(input instanceof Set)) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected Set, received ${getTypeName(input)}`,
        expected: "set",
        received: getTypeName(input),
      }]);
    }

    const errors: ValiIssue[] = [];

    for (const check of this._checks) {
      switch (check.kind) {
        case "min":
          if (input.size < check.value) {
            errors.push({
              code: "too_small_set",
              path: [...ctx.path],
              message: check.message ?? `Set must contain at least ${check.value} element(s)`,
              minimum: check.value,
            });
          }
          break;
        case "max":
          if (input.size > check.value) {
            errors.push({
              code: "too_big_set",
              path: [...ctx.path],
              message: check.message ?? `Set must contain at most ${check.value} element(s)`,
              maximum: check.value,
            });
          }
          break;
        case "size":
          if (input.size !== check.value) {
            errors.push({
              code: "too_small_set",
              path: [...ctx.path],
              message: check.message ?? `Set must contain exactly ${check.value} element(s)`,
              minimum: check.value,
              maximum: check.value,
            });
          }
          break;
        case "nonempty":
          if (input.size === 0) {
            errors.push({
              code: "too_small_set",
              path: [...ctx.path],
              message: check.message ?? "Set must not be empty",
              minimum: 1,
            });
          }
          break;
      }
    }

    if (errors.length > 0) return fail(errors);

    const result = new Set<Infer<T>>();
    const itemErrors: ValiIssue[] = [];
    let hasAsync = false;
    const promises: Promise<void>[] = [];
    let idx = 0;

    for (const item of input) {
      const itemCtx: ParseCtx = { path: [...ctx.path, idx++], async: ctx.async };
      const res = this.valueSchema._parse(item, itemCtx);

      if (res instanceof Promise) {
        hasAsync = true;
        promises.push(res.then((r) => {
          if (isOk(r)) result.add(r.data as Infer<T>);
          else itemErrors.push(...r.errors);
        }));
      } else {
        if (isOk(res)) result.add(res.data as Infer<T>);
        else itemErrors.push(...res.errors);
      }
    }

    if (hasAsync) {
      return Promise.all(promises).then(() =>
        itemErrors.length > 0 ? fail(itemErrors) : ok(result)
      );
    }

    return itemErrors.length > 0 ? fail(itemErrors) : ok(result);
  }

  _addCheck(check: SetCheck): this {
    const clone = this._clone();
    (clone as SetSchema<T>)._checks = [...this._checks, check];
    return clone;
  }

  min(value: number, message?: string): this {
    return this._addCheck({ kind: "min", value, message });
  }

  max(value: number, message?: string): this {
    return this._addCheck({ kind: "max", value, message });
  }

  size(value: number, message?: string): this {
    return this._addCheck({ kind: "size", value, message });
  }

  nonempty(message?: string): this {
    return this._addCheck({ kind: "nonempty", message });
  }
}

export function set<T extends AnySchema>(valueSchema: T): SetSchema<T> {
  return new SetSchema(valueSchema);
}
