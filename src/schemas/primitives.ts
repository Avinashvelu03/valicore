import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

// ─── Symbol ──────────────────────────────────────────────────────────────────
export class SymbolSchema extends Schema<symbol> {
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<symbol> {
    if (typeof input !== "symbol") {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected symbol, received ${getTypeName(input)}`,
        expected: "symbol",
        received: getTypeName(input),
      }]);
    }
    return ok(input);
  }
}

export function symbol(): SymbolSchema {
  return new SymbolSchema();
}

// ─── Undefined ───────────────────────────────────────────────────────────────
export class UndefinedSchema extends Schema<undefined> {
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<undefined> {
    if (input !== undefined) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected undefined, received ${getTypeName(input)}`,
        expected: "undefined",
        received: getTypeName(input),
      }]);
    }
    return ok(undefined);
  }
}

export function undefinedSchema(): UndefinedSchema {
  return new UndefinedSchema();
}

// ─── Null ────────────────────────────────────────────────────────────────────
export class NullSchema extends Schema<null> {
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<null> {
    if (input !== null) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected null, received ${getTypeName(input)}`,
        expected: "null",
        received: getTypeName(input),
      }]);
    }
    return ok(null);
  }
}

export function nullSchema(): NullSchema {
  return new NullSchema();
}

// ─── Void ────────────────────────────────────────────────────────────────────
export class VoidSchema extends Schema<void> {
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<void> {
    if (input !== undefined && input !== null) {
      return fail([{
        code: "invalid_type",
        path: [...ctx.path],
        message: `Expected void (undefined or null), received ${getTypeName(input)}`,
        expected: "void",
        received: getTypeName(input),
      }]);
    }
    return ok(input as void);
  }
}

export function voidSchema(): VoidSchema {
  return new VoidSchema();
}

// ─── Any ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AnySchema extends Schema<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parseValue(input: unknown, _ctx: ParseCtx): ParseResult<any> {
    return ok(input);
  }
}

export function any(): AnySchema {
  return new AnySchema();
}

// ─── Unknown ─────────────────────────────────────────────────────────────────
export class UnknownSchema extends Schema<unknown> {
  _parseValue(input: unknown, _ctx: ParseCtx): ParseResult<unknown> {
    return ok(input);
  }
}

export function unknown(): UnknownSchema {
  return new UnknownSchema();
}

// ─── Never ───────────────────────────────────────────────────────────────────
export class NeverSchema extends Schema<never> {
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<never> {
    return fail([{
      code: "invalid_type",
      path: [...ctx.path],
      message: `Expected never, received ${getTypeName(input)}`,
      expected: "never",
      received: getTypeName(input),
    }]);
  }
}

export function neverSchema(): NeverSchema {
  return new NeverSchema();
}

// ─── NaN ─────────────────────────────────────────────────────────────────────
export class NaNSchema extends Schema<number> {
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<number> {
    if (typeof input !== "number" || !isNaN(input)) {
      return fail([{
        code: "not_nan",
        path: [...ctx.path],
        message: `Expected NaN, received ${getTypeName(input)}`,
        expected: "nan",
        received: getTypeName(input),
      }]);
    }
    return ok(input);
  }
}

export function nan(): NaNSchema {
  return new NaNSchema();
}
