import { type ParseCtx } from "../core/schema.js";
import { type ParseResult } from "../core/result.js";
import { StringSchema } from "./string.js";
import { NumberSchema } from "./number.js";
import { BooleanSchema } from "./boolean.js";
import { DateSchema } from "./date.js";
import { BigIntSchema } from "./bigint.js";

class CoercedStringSchema extends StringSchema {
  override _parseValue(input: unknown, ctx: ParseCtx): ParseResult<string> {
    const coerced = input === null || input === undefined ? "" : String(input);
    return super._parseValue(coerced, ctx);
  }
}

class CoercedNumberSchema extends NumberSchema {
  override _parseValue(input: unknown, ctx: ParseCtx): ParseResult<number> {
    let coerced: unknown = input;
    if (typeof input === "string" && input.trim() !== "") coerced = Number(input);
    else if (typeof input === "boolean") coerced = input ? 1 : 0;
    else if (input instanceof Date) coerced = input.getTime();
    return super._parseValue(coerced, ctx);
  }
}

class CoercedBooleanSchema extends BooleanSchema {
  override _parseValue(input: unknown, ctx: ParseCtx): ParseResult<boolean> {
    return super._parseValue(Boolean(input), ctx);
  }
}

class CoercedDateSchema extends DateSchema {
  override _parseValue(input: unknown, ctx: ParseCtx): ParseResult<Date> {
    if (input instanceof Date) return super._parseValue(input, ctx);
    if (typeof input === "string" || typeof input === "number") return super._parseValue(new Date(input), ctx);
    return super._parseValue(input, ctx);
  }
}

class CoercedBigIntSchema extends BigIntSchema {
  override _parseValue(input: unknown, ctx: ParseCtx): ParseResult<bigint> {
    if (typeof input === "bigint") return super._parseValue(input, ctx);
    try {
      if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
        return super._parseValue(BigInt(input), ctx);
      }
    } catch { /* fall through */ }
    return super._parseValue(input, ctx);
  }
}

export const coerce = {
  string: () => new CoercedStringSchema(),
  number: () => new CoercedNumberSchema(),
  boolean: () => new CoercedBooleanSchema(),
  date: () => new CoercedDateSchema(),
  bigint: () => new CoercedBigIntSchema(),
};
