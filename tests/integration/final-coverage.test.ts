import { describe, it, expect } from "vitest";
import { string as str } from "../../src/schemas/string.js";
import { number as num } from "../../src/schemas/number.js";
import { object as obj } from "../../src/schemas/object.js";
import { record as rec } from "../../src/schemas/collections.js";
import { union as un, discriminatedUnion as du, intersection as intr } from "../../src/schemas/composite.js";
import { literal } from "../../src/schemas/literal.js";
import { boolean as bool } from "../../src/schemas/boolean.js";
import { ValiError } from "../../src/core/errors.js";
import { coerce } from "../../src/schemas/coerce.js";
import { toJSONSchema } from "../../src/plugins/jsonSchema.js";
import { date as dt } from "../../src/schemas/date.js";

// ─── errors.ts line 56-57: the `get message()` getter path ────────────────────
describe("ValiError.message getter", () => {
  it("returns formatted message from getter", () => {
    const err = new ValiError([{ code: "custom", path: [], message: "Test message" }]);
    // Access via the getter explicitly - different from constructor call
    const msg: string = err.message;
    expect(msg).toContain("Test message");
  });

  it("getter with multiple issues", () => {
    const err = new ValiError([
      { code: "custom", path: ["a"], message: "Error A" },
      { code: "custom", path: ["b"], message: "Error B" },
    ]);
    const msg = err.message;
    expect(msg).toContain("2 validation errors");
  });
});

// ─── schema.ts lines 221-232: TransformSchema when transform adds issues ──────
describe("TransformSchema issue injection via ctx.addIssue", () => {
  it("transform can add issues via ctx and fail", () => {
    const schema = str().transform((v, ctx) => {
      if (v.length > 5) ctx.addIssue({ code: "custom", message: "Too long after transform" });
      return v.toUpperCase();
    });
    const r = schema.safeParse("toolongstring");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Too long after transform");
  });

  it("transform that succeeds does not add issues", () => {
    const schema = str().transform((v) => v.toUpperCase());
    expect(schema.parse("hello")).toBe("HELLO");
  });

  it("async transform that fails via ctx.addIssue", async () => {
    const schema = str().transform(async (v, ctx) => {
      await new Promise((r) => setTimeout(r, 1));
      if (v.length > 3) ctx.addIssue({ code: "custom", message: "Async too long" });
      return v;
    });
    const r = await schema.safeParseAsync("toolong");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Async too long");
  });

  it("async transform that succeeds", async () => {
    const schema = str().transform(async (v) => v.length);
    expect(await schema.parseAsync("hello")).toBe(5);
  });
});

// ─── schema.ts lines 253-256: PipelineSchema when first schema is async ───────
describe("PipelineSchema async first schema", () => {
  it("async pipe passes through when first schema is async", async () => {
    const asyncStr = str().refine(async (v) => v.length > 0, "Empty");
    const piped = asyncStr.pipe(str().toUpperCase());
    expect(await piped.parseAsync("hello")).toBe("HELLO");
  });

  it("async pipe propagates first schema failure", async () => {
    const asyncStr = str().refine(async (v) => v.length > 5, "Too short");
    const piped = asyncStr.pipe(str().toUpperCase());
    await expect(piped.parseAsync("hi")).rejects.toThrow();
  });
});

// ─── jsonSchema.ts lines 87-88: fallback `return base` for unknown schema ─────
describe("jsonSchema fallback for unknown schema type", () => {
  it("returns base object for unrecognized schema type", async () => {
    const { Schema: BaseSchema } = await import("../../src/core/schema.js");
    const { ok: okR } = await import("../../src/core/result.js");
    class MyCustomSchema extends BaseSchema<string> {
      _parseValue(input: unknown) { return okR(String(input)); }
    }
    const js = toJSONSchema(new MyCustomSchema() as any);
    expect(js).toBeDefined();
    expect(js.$schema).toBeDefined();
    expect(js.type).toBeUndefined();
  });
});

// ─── collections.ts lines 47-58: async key validation in record ───────────────
describe("record async key validation", () => {
  it("validates with async key schema", async () => {
    // String schema with async refinement used as key validator
    const keySchema = str().refine(async (k) => k.startsWith("user_"), "Key must start with user_");
    const schema = rec(keySchema, num());
    await expect(schema.parseAsync({ user_1: 100 })).resolves.toEqual({ user_1: 100 });
  });

  it("rejects invalid async key", async () => {
    const keySchema = str().refine(async (k) => k.startsWith("user_"), "Key must start with user_");
    const schema = rec(keySchema, num());
    await expect(schema.parseAsync({ bad_key: 100 })).rejects.toThrow();
  });

  it("async key failing still short-circuits that key", async () => {
    const keySchema = str().refine(async (k) => k.length > 3, "Key too short");
    const schema = rec(keySchema, num());
    const r = await schema.safeParseAsync({ ab: 1 });
    expect(r.success).toBe(false);
  });

  it("async value validation in record with sync key", async () => {
    const schema = rec(str(), num().refine(async (v) => v >= 0, "Must be non-negative"));
    const r = await schema.safeParseAsync({ a: -1 });
    expect(r.success).toBe(false);
  });
});

// ─── composite.ts 213-223: discriminatedUnion async fallback path ─────────────
describe("discriminatedUnion async fallback", () => {
  it("async discriminated union option validation", async () => {
    const schema = du("type", [
      obj({ type: literal("cat"), name: str().refine(async (v) => v.length > 0, "Empty") }),
    ]);
    await expect(schema.parseAsync({ type: "cat", name: "Whiskers" })).resolves.toBeDefined();
    await expect(schema.parseAsync({ type: "cat", name: "" })).rejects.toThrow();
  });
});

// ─── composite.ts 288-293: intersection when both results are async ───────────
describe("intersection both async", () => {
  it("handles intersection where both schemas are async", async () => {
    const a = obj({ x: num().refine(async (v) => v > 0, "Positive") });
    const b = obj({ y: str().refine(async (v) => v.length > 0, "Non-empty") });
    const schema = intr(a, b);
    const r = await schema.parseAsync({ x: 1, y: "hello" });
    expect(r).toMatchObject({ x: 1, y: "hello" });
  });

  it("fails intersection when right is invalid", async () => {
    const a = obj({ x: num() });
    const b = obj({ y: str().refine(async (v) => v.length > 5, "Too short") });
    const schema = intr(a, b);
    await expect(schema.parseAsync({ x: 1, y: "hi" })).rejects.toThrow();
  });
});

// ─── object.ts line 79-80: async passthrough path ────────────────────────────
describe("object passthrough with async field", () => {
  it("async object with passthrough keeps extra keys", async () => {
    const schema = obj({
      name: str().refine(async (v) => v.length > 0, "Required"),
    }).passthrough();
    const r = await schema.parseAsync({ name: "Alice", extra: "value" });
    expect((r as Record<string, unknown>)["extra"]).toBe("value");
  });

  it("async object with strict rejects extra keys", async () => {
    const schema = obj({
      name: str().refine(async (v) => v.length > 0, "Required"),
    }).strict();
    // Strict mode error - use safeParseAsync since schema has async refinements
    const r = await schema.safeParseAsync({ name: "Alice", extra: "value" });
    expect(r.success).toBe(false);
  });
});

// ─── coerce.ts line 36: coerce.date with non-string/number falls through ──────
describe("coerce.date fallthrough", () => {
  it("coerce.date passes invalid non-date object to DateSchema (fails)", () => {
    expect(() => coerce.date().parse({})).toThrow(ValiError);
  });
  it("coerce.date passes null (falls through, fails)", () => {
    expect(() => coerce.date().parse(null)).toThrow();
  });
  it("coerce.date passes boolean (falls through, fails)", () => {
    expect(() => coerce.date().parse(true)).toThrow();
  });
});

// ─── object.ts required() method ─────────────────────────────────────────────
describe("object.required()", () => {
  it("returns a new ObjectSchema with the same shape", () => {
    const schema = obj({ name: str(), age: num() });
    const required = schema.required();
    expect(required.parse({ name: "Alice", age: 30 })).toEqual({ name: "Alice", age: 30 });
  });
  it("still validates fields", () => {
    const schema = obj({ name: str() }).required();
    expect(() => schema.parse({ name: 42 })).toThrow();
  });
});

// ─── coerce.number: non-string/boolean/Date falls through unchanged ────────────
describe("coerce.number passthrough behavior", () => {
  it("passes object through unchanged (fails as not a number)", () => {
    expect(() => coerce.number().parse({})).toThrow();
  });
  it("passes array through unchanged (fails)", () => {
    expect(() => coerce.number().parse([])).toThrow();
  });
  it("passes undefined through (fails)", () => {
    expect(() => coerce.number().parse(undefined)).toThrow();
  });
});

// ─── string.ts: emoji check triggers on emoji-like paths ─────────────────────
describe("string emoji ip custom messages", () => {
  it("ip v4 custom message", () => {
    const r = str().ip({ version: 4, message: "Bad IPv4" }).safeParse("::1");
    if (!r.success) expect(r.errors[0]!.message).toBe("Bad IPv4");
  });
  it("ip v6 custom message", () => {
    const r = str().ip({ version: 6, message: "Bad IPv6" }).safeParse("192.168.1.1");
    if (!r.success) expect(r.errors[0]!.message).toBe("Bad IPv6");
  });
  it("ip no version custom message", () => {
    const r = str().ip({ message: "Invalid IP" }).safeParse("not-an-ip");
    if (!r.success) expect(r.errors[0]!.message).toBe("Invalid IP");
  });
});
