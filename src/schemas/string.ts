/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, type ParseCtx } from "../core/schema.js";
import { ok, fail, type ParseResult } from "../core/result.js";
import { getTypeName } from "../core/errors.js";

const EMAIL_REGEX = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
const URL_REGEX = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^c[^\s-]{8,}$/i;
const CUID2_REGEX = /^[0-9a-z]+$/;
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const EMOJI_REGEX = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
const IP_V4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const IP_V6_REGEX = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
const BASE64_REGEX = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

type StringCheck =
  | { kind: "min"; value: number; message?: string }
  | { kind: "max"; value: number; message?: string }
  | { kind: "length"; value: number; message?: string }
  | { kind: "email"; message?: string }
  | { kind: "url"; message?: string }
  | { kind: "uuid"; message?: string }
  | { kind: "cuid"; message?: string }
  | { kind: "cuid2"; message?: string }
  | { kind: "ulid"; message?: string }
  | { kind: "emoji"; message?: string }
  | { kind: "ip"; version?: 4 | 6; message?: string }
  | { kind: "regex"; pattern: RegExp; message?: string }
  | { kind: "startsWith"; value: string; message?: string }
  | { kind: "endsWith"; value: string; message?: string }
  | { kind: "includes"; value: string; message?: string }
  | { kind: "nonempty"; message?: string }
  | { kind: "trim" }
  | { kind: "toLowerCase" }
  | { kind: "toUpperCase" }
  | { kind: "datetime"; message?: string }
  | { kind: "base64"; message?: string };

export class StringSchema extends Schema<string> {
  _checks: StringCheck[] = [];

  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<string> {
    if (typeof input !== "string") {
      return fail([{
        code: "invalid_type", path: [...ctx.path],
        message: `Expected string, received ${getTypeName(input)}`,
        expected: "string", received: getTypeName(input),
      }]);
    }

    let value = input;
    const errors: (typeof fail extends (...a: any[]) => infer R ? R : never)["errors"] = [];

    for (const check of this._checks) {
      switch (check.kind) {
        case "trim": value = value.trim(); break;
        case "toLowerCase": value = value.toLowerCase(); break;
        case "toUpperCase": value = value.toUpperCase(); break;
        case "min":
          if (value.length < check.value)
            errors.push({ code: "too_small", path: [...ctx.path], message: check.message ?? `String must contain at least ${check.value} character(s)`, minimum: check.value });
          break;
        case "max":
          if (value.length > check.value)
            errors.push({ code: "too_big", path: [...ctx.path], message: check.message ?? `String must contain at most ${check.value} character(s)`, maximum: check.value });
          break;
        case "length":
          if (value.length !== check.value)
            errors.push({ code: "too_small", path: [...ctx.path], message: check.message ?? `String must contain exactly ${check.value} character(s)`, minimum: check.value, maximum: check.value });
          break;
        case "nonempty":
          if (value.length === 0)
            errors.push({ code: "too_small", path: [...ctx.path], message: check.message ?? "String must not be empty", minimum: 1 });
          break;
        case "email":
          if (!EMAIL_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid email address" });
          break;
        case "url":
          if (!URL_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid URL" });
          break;
        case "uuid":
          if (!UUID_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid UUID" });
          break;
        case "cuid":
          if (!CUID_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid CUID" });
          break;
        case "cuid2":
          if (!CUID2_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid CUID2" });
          break;
        case "ulid":
          if (!ULID_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid ULID" });
          break;
        case "emoji":
          if (!EMOJI_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid emoji" });
          break;
        case "ip": {
          const v4 = IP_V4_REGEX.test(value);
          const v6 = IP_V6_REGEX.test(value);
          const valid = check.version === 4 ? v4 : check.version === 6 ? v6 : v4 || v6;
          if (!valid)
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? `Invalid IP${check.version ? ` v${check.version}` : ""} address` });
          break;
        }
        case "regex":
          if (!check.pattern.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid format" });
          break;
        case "startsWith":
          if (!value.startsWith(check.value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? `String must start with "${check.value}"` });
          break;
        case "endsWith":
          if (!value.endsWith(check.value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? `String must end with "${check.value}"` });
          break;
        case "includes":
          if (!value.includes(check.value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? `String must include "${check.value}"` });
          break;
        case "datetime":
          if (!DATETIME_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid datetime string" });
          break;
        case "base64":
          if (!BASE64_REGEX.test(value))
            errors.push({ code: "invalid_string", path: [...ctx.path], message: check.message ?? "Invalid base64 string" });
          break;
      }
    }

    if (errors.length > 0) return fail(errors);
    return ok(value);
  }

  _addCheck(check: StringCheck): this {
    const clone = this._clone();
    (clone as StringSchema)._checks = [...this._checks, check];
    return clone;
  }

  min(value: number, message?: string): this { return this._addCheck({ kind: "min", value, message }); }
  max(value: number, message?: string): this { return this._addCheck({ kind: "max", value, message }); }
  length(value: number, message?: string): this { return this._addCheck({ kind: "length", value, message }); }
  email(message?: string): this { return this._addCheck({ kind: "email", message }); }
  url(message?: string): this { return this._addCheck({ kind: "url", message }); }
  uuid(message?: string): this { return this._addCheck({ kind: "uuid", message }); }
  cuid(message?: string): this { return this._addCheck({ kind: "cuid", message }); }
  cuid2(message?: string): this { return this._addCheck({ kind: "cuid2", message }); }
  ulid(message?: string): this { return this._addCheck({ kind: "ulid", message }); }
  emoji(message?: string): this { return this._addCheck({ kind: "emoji", message }); }
  ip(opts?: { version?: 4 | 6; message?: string }): this { return this._addCheck({ kind: "ip", ...opts }); }
  regex(pattern: RegExp, message?: string): this { return this._addCheck({ kind: "regex", pattern, message }); }
  startsWith(value: string, message?: string): this { return this._addCheck({ kind: "startsWith", value, message }); }
  endsWith(value: string, message?: string): this { return this._addCheck({ kind: "endsWith", value, message }); }
  includes(value: string, message?: string): this { return this._addCheck({ kind: "includes", value, message }); }
  nonempty(message?: string): this { return this._addCheck({ kind: "nonempty", message }); }
  trim(): this { return this._addCheck({ kind: "trim" }); }
  toLowerCase(): this { return this._addCheck({ kind: "toLowerCase" }); }
  toUpperCase(): this { return this._addCheck({ kind: "toUpperCase" }); }
  datetime(message?: string): this { return this._addCheck({ kind: "datetime", message }); }
  base64(message?: string): this { return this._addCheck({ kind: "base64", message }); }
}

export function string(): StringSchema { return new StringSchema(); }
