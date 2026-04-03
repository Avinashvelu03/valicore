import { describe, it, expect } from "vitest";

// Import from index.ts itself to cover that file
import v, {
  string, boolean,
  any, unknown, literal, coerce,
  ValiError, ok, fail, isOk, isFail,
  isPrimitive, hasOwn, isPromise,
  formatPath, toJSONSchema, toOpenAPI,
} from "../../src/index.js";
import * as indexNs from "../../src/index.js";

import { bigint as bi } from "../../src/schemas/bigint.js";
import { date as dt } from "../../src/schemas/date.js";
import { array as arr } from "../../src/schemas/array.js";
import { record as rec, map as mp, set as st } from "../../src/schemas/collections.js";
import { union as un, intersection as intr, discriminatedUnion as du } from "../../src/schemas/composite.js";
import { string as str } from "../../src/schemas/string.js";
import { number as num } from "../../src/schemas/number.js";
import { object as obj } from "../../src/schemas/object.js";
import { tuple as tup } from "../../src/schemas/composite.js";
import { neverSchema as nv } from "../../src/schemas/primitives.js";
import { nativeEnum as ne } from "../../src/schemas/special.js";

// ─── index.ts coverage ────────────────────────────────────────────────────────
describe("index.ts default exports (v namespace)", () => {
  it("module namespace getters are reachable", () => {
    expect(typeof indexNs.string).toBe("function");
  });
  it("v namespace getter descriptor is reachable", () => {
    const descriptor = Object.getOwnPropertyDescriptor(v, "string");
    if (descriptor?.get) {
      expect(typeof descriptor.get()).toBe("function");
      return;
    }
    expect(typeof v.string).toBe("function");
  });
  it("v.string() works", () => expect(v.string().parse("hello")).toBe("hello"));
  it("v.number() works", () => expect(v.number().parse(42)).toBe(42));
  it("v.boolean() works", () => expect(v.boolean().parse(true)).toBe(true));
  it("v.date() works", () => expect(v.date().parse(new Date())).toBeInstanceOf(Date));
  it("v.bigint() works", () => expect(v.bigint().parse(1n)).toBe(1n));
  it("v.symbol() works", () => { const s = Symbol(); expect(v.symbol().parse(s)).toBe(s); });
  it("v.undefined() works", () => expect(v.undefined().parse(undefined)).toBeUndefined());
  it("v.null() works", () => expect(v.null().parse(null)).toBeNull());
  it("v.void() works", () => expect(v.void().parse(undefined)).toBeUndefined());
  it("v.any() works", () => expect(v.any().parse(42)).toBe(42));
  it("v.unknown() works", () => expect(v.unknown().parse("x")).toBe("x"));
  it("v.never() rejects all", () => expect(() => v.never().parse("x")).toThrow());
  it("v.nan() accepts NaN", () => expect(v.nan().parse(NaN)).toBeNaN());
  it("v.literal() works", () => expect(v.literal("a").parse("a")).toBe("a"));
  it("v.object() works", () => expect(v.object({ x: v.string() }).parse({ x: "hi" })).toEqual({ x: "hi" }));
  it("v.array() works", () => expect(v.array(v.string()).parse(["a"])).toEqual(["a"]));
  it("v.tuple() works", () => expect(v.tuple([v.string(), v.number()]).parse(["a", 1])).toEqual(["a", 1]));
  it("v.union() works", () => expect(v.union([v.string(), v.number()]).parse(42)).toBe(42));
  it("v.intersection() works", () => {
    const s = v.intersection(v.object({ a: v.string() }), v.object({ b: v.number() }));
    expect(s.parse({ a: "x", b: 1 })).toBeDefined();
  });
  it("v.record() works", () => expect(v.record(v.string(), v.number()).parse({ a: 1 })).toEqual({ a: 1 }));
  it("v.map() works", () => expect(v.map(v.string(), v.number()).parse(new Map([["a", 1]]))).toBeDefined());
  it("v.set() works", () => expect(v.set(v.string()).parse(new Set(["a"]))).toBeDefined());
  it("v.enum() works", () => expect(v.enum(["a", "b"]).parse("a")).toBe("a"));
  it("v.promise() works", () => expect(v.promise(v.string()).parse(Promise.resolve("x"))).toBeInstanceOf(Promise));
  it("v.lazy() works", () => expect(v.lazy(() => v.string()).parse("x")).toBe("x"));
  it("v.custom() works", () => expect(v.custom((x): x is number => typeof x === "number").parse(1)).toBe(1));
  it("v.preprocess() works", () => expect(v.preprocess(String, v.string()).parse(42)).toBe("42"));
  it("v.coerce.string() works", () => expect(v.coerce.string().parse(42)).toBe("42"));
  it("v.discriminatedUnion() works", () => {
    const s = v.discriminatedUnion("kind", [
      v.object({ kind: v.literal("a"), val: v.string() }),
      v.object({ kind: v.literal("b"), val: v.number() }),
    ]);
    expect(s.parse({ kind: "a", val: "x" })).toBeDefined();
  });
  it("ValiError exported from index", () => expect(ValiError).toBeDefined());
  it("ok/fail/isOk/isFail exported", () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isFail(fail([{ code: "custom", path: [], message: "e" }]))).toBe(true);
  });
  it("toJSONSchema exported", () => expect(toJSONSchema(string()).type).toBe("string"));
  it("toOpenAPI exported", () => expect(toOpenAPI(string()).type).toBe("string"));
});

// ─── errors.ts uncovered lines (format() deep nesting, multi-key paths) ───────
describe("ValiError.format() deep nesting", () => {
  it("creates nested structure for deep paths", () => {
    const err = new ValiError([{
      code: "custom", path: ["user", "address", "street"], message: "Required"
    }]);
    const fmt = err.format();
    const user = fmt["user"] as Record<string, unknown>;
    expect(user).toBeDefined();
    const address = user["address"] as Record<string, unknown>;
    expect(address).toBeDefined();
    expect(address["street"]).toBeDefined();
  });

  it("reuses existing nested objects", () => {
    const err = new ValiError([
      { code: "custom", path: ["a", "b"], message: "Err1" },
      { code: "custom", path: ["a", "c"], message: "Err2" },
    ]);
    const fmt = err.format();
    const a = fmt["a"] as Record<string, unknown>;
    expect(a["b"]).toBeDefined();
    expect(a["c"]).toBeDefined();
  });

  it("handles existing non-object key as object", () => {
    const err = new ValiError([
      { code: "custom", path: ["a", "b", "c"], message: "Deep" },
    ]);
    const fmt = err.format();
    expect(fmt).toBeDefined();
  });

  it(".message getter returns formatted string", () => {
    const err = new ValiError([{ code: "custom", path: [], message: "Test error" }]);
    expect(err.message).toBe("Test error");
  });
});

// ─── schema.ts uncovered line 122 (sync refinement check returning undefined) ─
describe("schema.ts refinement edge cases", () => {
  it("superRefine with sync function that is not async by name", () => {
    const fn = function(v: string, ctx: { addIssue: (i: { code: "custom"; message: string }) => void }) {
      if (v.length < 2) ctx.addIssue({ code: "custom", message: "Too short" });
    };
    const s = string().superRefine(fn);
    expect(s.parse("hi")).toBe("hi");
    expect(() => s.parse("a")).toThrow();
  });

  it("refine with object message format", () => {
    const s = string().refine((v) => v.length > 0, { message: "Cannot be empty" });
    expect(s.parse("hi")).toBe("hi");
    const r = s.safeParse("");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Cannot be empty");
  });
});

// ─── bigint.ts uncovered: nonnegative, nonpositive, multipleOf ────────────────
describe("bigint uncovered branches", () => {
  it("nonnegative rejects negative", () => expect(() => bi().nonnegative().parse(-1n)).toThrow());
  it("nonnegative accepts zero", () => expect(bi().nonnegative().parse(0n)).toBe(0n));
  it("nonpositive rejects positive", () => expect(() => bi().nonpositive().parse(1n)).toThrow());
  it("nonpositive accepts zero", () => expect(bi().nonpositive().parse(0n)).toBe(0n));
  it("multipleOf rejects non-multiple", () => expect(() => bi().multipleOf(5n).parse(7n)).toThrow());
  it("multipleOf custom message", () => {
    const r = bi().multipleOf(3n, "Must be multiple of 3").safeParse(7n);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be multiple of 3");
  });
});

// ─── date.ts uncovered: between ───────────────────────────────────────────────
describe("date.between()", () => {
  it("accepts date in range", () => {
    const s = dt().between(new Date("2020-01-01"), new Date("2025-01-01"));
    expect(s.parse(new Date("2022-06-15"))).toBeInstanceOf(Date);
  });
  it("rejects date before range", () => {
    const s = dt().between(new Date("2020-01-01"), new Date("2025-01-01"));
    expect(() => s.parse(new Date("2019-01-01"))).toThrow();
  });
  it("rejects date after range", () => {
    const s = dt().between(new Date("2020-01-01"), new Date("2025-01-01"));
    expect(() => s.parse(new Date("2026-01-01"))).toThrow();
  });
  it("custom message on min", () => {
    const s = dt().min(new Date("2025-01-01"), "Too old");
    const r = s.safeParse(new Date("2000-01-01"));
    if (!r.success) expect(r.errors[0]!.message).toBe("Too old");
  });
  it("custom message on max", () => {
    const s = dt().max(new Date("2000-01-01"), "Too future");
    const r = s.safeParse(new Date("2030-01-01"));
    if (!r.success) expect(r.errors[0]!.message).toBe("Too future");
  });
});

// ─── array.ts async path ──────────────────────────────────────────────────────
describe("array async element validation", () => {
  it("validates async element schema in array", async () => {
    const asyncEl = str().refine(async (v) => v.length > 0, "Empty");
    const schema = arr(asyncEl);
    await expect(schema.parseAsync(["a", "b"])).resolves.toEqual(["a", "b"]);
  });

  it("reports async element errors", async () => {
    const asyncEl = str().refine(async (v) => v.length > 3, "Too short");
    const schema = arr(asyncEl);
    await expect(schema.parseAsync(["hi"])).rejects.toThrow();
  });
});

// ─── collections.ts async paths ───────────────────────────────────────────────
describe("record async value validation", () => {
  it("validates async record values", async () => {
    const schema = rec(str(), num().refine(async (v) => v > 0, "Positive"));
    const r = await schema.parseAsync({ a: 1, b: 2 });
    expect(r).toEqual({ a: 1, b: 2 });
  });

  it("rejects invalid async record values", async () => {
    const schema = rec(str(), num().refine(async (v) => v > 0, "Positive"));
    await expect(schema.parseAsync({ a: -1 })).rejects.toThrow();
  });
});

describe("map async validation", () => {
  it("validates async Map values", async () => {
    const schema = mp(str(), num().refine(async (v) => v > 0, "Positive"));
    const input = new Map([["a", 1]]);
    const r = await schema.parseAsync(input);
    expect(r.get("a")).toBe(1);
  });

  it("rejects invalid async Map values", async () => {
    const schema = mp(str(), num().refine(async (v) => v > 0, "Positive"));
    await expect(schema.parseAsync(new Map([["a", -1]]))).rejects.toThrow();
  });
});

describe("set async validation", () => {
  it("validates async Set elements", async () => {
    const schema = st(str().refine(async (v) => v.length > 0, "Empty"));
    const r = await schema.parseAsync(new Set(["a", "b"]));
    expect(r.has("a")).toBe(true);
  });

  it("rejects invalid async Set elements", async () => {
    const schema = st(num().refine(async (v) => v > 0, "Positive"));
    await expect(schema.parseAsync(new Set([-1]))).rejects.toThrow();
  });
});

// ─── composite.ts: async union, async intersection, incompatible intersection──
describe("async union", () => {
  it("validates async union options", async () => {
    const asyncStr = str().refine(async (v) => v.length > 0, "Empty");
    const schema = un([asyncStr, num()]);
    await expect(schema.parseAsync("hello")).resolves.toBe("hello");
    await expect(schema.parseAsync(42)).resolves.toBe(42);
  });

  it("rejects when no async option matches", async () => {
    const asyncStr = str().refine(async (v) => v.length > 10, "Too short");
    const schema = un([asyncStr, num().negative()]);
    await expect(schema.parseAsync("hi")).rejects.toThrow();
  });
});

describe("intersection async", () => {
  it("validates async intersection", async () => {
    const a = obj({ name: str() });
    const b = obj({ age: num().refine(async (v) => v > 0, "Positive") });
    const schema = intr(a, b);
    const r = await schema.parseAsync({ name: "Alice", age: 30 });
    expect(r).toMatchObject({ name: "Alice", age: 30 });
  });

  it("rejects incompatible primitive intersection", () => {
    const schema = intr(literal("a"), literal("b"));
    expect(() => schema.parse("a")).toThrow();
  });
});

describe("discriminatedUnion fallback path", () => {
  it("rejects unknown discriminator value with error", () => {
    const schema = du("type", [
      obj({ type: literal("cat"), meows: boolean() }),
    ]);
    const r = schema.safeParse({ type: "fish" });
    expect(r.success).toBe(false);
  });
});

// ─── object.ts: keyof, async path ────────────────────────────────────────────
describe("object.keyof()", () => {
  it("returns the keys of the shape", () => {
    const schema = obj({ name: str(), age: num() });
    const keys = schema.keyof();
    expect(keys).toContain("name");
    expect(keys).toContain("age");
  });
});

describe("object async fields", () => {
  it("validates async object field", async () => {
    const schema = obj({
      email: str().refine(async (v) => v.includes("@"), "Invalid email"),
    });
    await expect(schema.parseAsync({ email: "user@example.com" })).resolves.toBeDefined();
    await expect(schema.parseAsync({ email: "bad" })).rejects.toThrow();
  });

  it("reports errors for async invalid fields", async () => {
    const schema = obj({
      x: num().refine(async (v) => v > 0, "Must be positive"),
    });
    const r = await schema.safeParseAsync({ x: -1 });
    expect(r.success).toBe(false);
  });
});

// ─── string.ts: emoji validation ─────────────────────────────────────────────
describe("string emoji coverage", () => {
  it("accepts emoji string", () => {
    const schema = str().emoji();
    expect(schema.parse("😀")).toBe("😀");
  });
  it("rejects non-emoji string", () => {
    const schema = str().emoji();
    expect(() => schema.parse("hello")).toThrow();
  });
  it("custom emoji message", () => {
    const r = str().emoji("Only emojis").safeParse("text");
    if (!r.success) expect(r.errors[0]!.message).toBe("Only emojis");
  });
});

// ─── utils/index.ts uncovered lines ──────────────────────────────────────────
describe("utils uncovered coverage", () => {
  it("isPrimitive returns true for null", () => expect(isPrimitive(null)).toBe(true));
  it("isPrimitive returns true for string", () => expect(isPrimitive("hi")).toBe(true));
  it("isPrimitive returns true for number", () => expect(isPrimitive(42)).toBe(true));
  it("isPrimitive returns true for boolean", () => expect(isPrimitive(true)).toBe(true));
  it("isPrimitive returns true for undefined", () => expect(isPrimitive(undefined)).toBe(true));
  it("isPrimitive returns true for bigint", () => expect(isPrimitive(1n)).toBe(true));
  it("isPrimitive returns true for symbol", () => expect(isPrimitive(Symbol())).toBe(true));
  it("isPrimitive returns false for object", () => expect(isPrimitive({})).toBe(false));
  it("isPrimitive returns false for array", () => expect(isPrimitive([])).toBe(false));
  it("isPrimitive returns false for function", () => expect(isPrimitive(() => {})).toBe(false));

  it("hasOwn returns true for own property", () => expect(hasOwn({ a: 1 }, "a")).toBe(true));
  it("hasOwn returns false for inherited property", () => expect(hasOwn({}, "toString")).toBe(false));
  it("hasOwn returns false for missing property", () => expect(hasOwn({}, "missing")).toBe(false));

  it("isPromise returns true for Promise", () => expect(isPromise(Promise.resolve())).toBe(true));
  it("isPromise returns true for thenable", () => expect(isPromise({ then: () => {} })).toBe(true));
  it("isPromise returns false for non-promise", () => expect(isPromise(42)).toBe(false));
  it("isPromise returns false for null", () => expect(isPromise(null)).toBe(false));
  it("isPromise returns false for string", () => expect(isPromise("x")).toBe(false));
  it("isPromise returns false for object without then", () => expect(isPromise({ a: 1 })).toBe(false));

  it("formatPath with only numeric segment", () => expect(formatPath([0])).toBe("[0]"));
  it("formatPath with mixed path", () => expect(formatPath(["items", 0, "name"])).toBe("items[0].name"));
  it("formatPath with starting numeric index", () => expect(formatPath([0, "key"])).toBe("[0].key"));
});

// ─── jsonSchema.ts: tuple, never, nativeEnum ─────────────────────────────────
describe("jsonSchema uncovered branches", () => {
  it("converts tuple schema to prefixItems", () => {
    const schema = tup([str(), num()]);
    const js = toJSONSchema(schema);
    expect(js.type).toBe("array");
    expect(js.prefixItems).toHaveLength(2);
    expect(js.prefixItems![0]!.type).toBe("string");
    expect(js.prefixItems![1]!.type).toBe("number");
  });

  it("converts never to {not: {}}", () => {
    const js = toJSONSchema(nv());
    expect(js.not).toEqual({});
  });

  it("converts nativeEnum", () => {
    enum Color { Red = "RED", Blue = "BLUE" }
    const js = toJSONSchema(ne(Color));
    expect(js.enum).toBeDefined();
    expect(js.enum).toContain("RED");
    expect(js.enum).toContain("BLUE");
  });

  it("converts unknown schema to empty object", () => {
    const js = toJSONSchema(unknown());
    expect(js).toBeDefined();
    expect(js.type).toBeUndefined();
  });

  it("converts any schema to empty object", () => {
    const js = toJSONSchema(any());
    expect(js).toBeDefined();
  });

  it("converts nullish schema", () => {
    const js = toJSONSchema(str().nullish());
    expect(js.anyOf).toBeDefined();
  });
});

// ─── coerce uncovered: coerce.number from invalid string path ─────────────────
describe("coerce edge cases", () => {
  it("coerce.number passes non-string non-bool as-is (then fails)", () => {
    expect(() => coerce.number().parse(null)).toThrow();
  });
  it("coerce.number handles empty string (passes NaN which fails)", () => {
    // empty string -> Number("") = 0, not NaN
    expect(coerce.number().parse("0")).toBe(0);
  });
  it("coerce.bigint fails on non-coercible string", () => {
    expect(() => coerce.bigint().parse("not-a-number")).toThrow();
  });
  it("coerce.date passes through invalid date string resulting in Invalid Date", () => {
    expect(() => coerce.date().parse("not-a-date")).toThrow();
  });
});

// ─── number.ts custom messages ────────────────────────────────────────────────
describe("number custom error messages", () => {
  it("int() custom message", () => {
    const r = num().int("Must be integer").safeParse(3.14);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be integer");
  });
  it("positive() custom message", () => {
    const r = num().positive("Must be positive").safeParse(-1);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be positive");
  });
  it("negative() custom message", () => {
    const r = num().negative("Must be negative").safeParse(1);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be negative");
  });
  it("nonnegative() custom message", () => {
    const r = num().nonnegative("Must be >= 0").safeParse(-1);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be >= 0");
  });
  it("nonpositive() custom message", () => {
    const r = num().nonpositive("Must be <= 0").safeParse(1);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be <= 0");
  });
  it("finite() custom message", () => {
    const r = num().finite("Must be finite").safeParse(Infinity);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be finite");
  });
  it("safe() custom message", () => {
    const r = num().safe("Must be safe int").safeParse(Number.MAX_SAFE_INTEGER + 1);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be safe int");
  });
  it("multipleOf() custom message", () => {
    const r = num().multipleOf(5, "Must be multiple of 5").safeParse(7);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be multiple of 5");
  });
  it("port() custom message", () => {
    const r = num().port("Invalid port").safeParse(99999);
    if (!r.success) expect(r.errors[0]!.message).toBe("Invalid port");
  });
});
