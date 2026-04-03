import { describe, it, expect } from "vitest";
import {
  Schema, OptionalSchema, NullableSchema, NullishSchema,
  DefaultSchema, CatchSchema, TransformSchema, BrandedSchema, PipelineSchema,
} from "../../src/core/schema.js";
import { string } from "../../src/schemas/string.js";
import { number } from "../../src/schemas/number.js";
import { ValiError } from "../../src/core/errors.js";

describe("Schema base class", () => {
  const s = string();

  it("should parse valid input", () => {
    expect(s.parse("hello")).toBe("hello");
  });

  it("should throw ValiError on invalid input", () => {
    expect(() => s.parse(42)).toThrow(ValiError);
  });

  it("safeParse returns success object", () => {
    const r = s.safeParse("hello");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("hello");
  });

  it("safeParse returns failure object", () => {
    const r = s.safeParse(42);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("parseAsync resolves for valid input", async () => {
    expect(await s.parseAsync("hi")).toBe("hi");
  });

  it("parseAsync rejects for invalid input", async () => {
    await expect(s.parseAsync(42)).rejects.toThrow(ValiError);
  });

  it("safeParseAsync resolves success", async () => {
    const r = await s.safeParseAsync("hi");
    expect(r.success).toBe(true);
  });

  it("safeParseAsync resolves failure", async () => {
    const r = await s.safeParseAsync(42);
    expect(r.success).toBe(false);
  });

  it(".optional() makes field optional", () => {
    const opt = s.optional();
    expect(opt).toBeInstanceOf(OptionalSchema);
    expect(opt.parse(undefined)).toBeUndefined();
    expect(opt.parse("hi")).toBe("hi");
  });

  it(".nullable() allows null", () => {
    const n = s.nullable();
    expect(n).toBeInstanceOf(NullableSchema);
    expect(n.parse(null)).toBeNull();
    expect(n.parse("hi")).toBe("hi");
  });

  it(".nullish() allows null and undefined", () => {
    const ns = s.nullish();
    expect(ns).toBeInstanceOf(NullishSchema);
    expect(ns.parse(null)).toBeNull();
    expect(ns.parse(undefined)).toBeUndefined();
    expect(ns.parse("hi")).toBe("hi");
  });

  it(".default() provides fallback for undefined", () => {
    const d = s.default("fallback");
    expect(d).toBeInstanceOf(DefaultSchema);
    expect(d.parse(undefined)).toBe("fallback");
    expect(d.parse("hi")).toBe("hi");
  });

  it(".default() accepts a function", () => {
    const d = s.default(() => "computed");
    expect(d.parse(undefined)).toBe("computed");
  });

  it(".catch() returns fallback on error", () => {
    const c = s.catch("fallback");
    expect(c).toBeInstanceOf(CatchSchema);
    expect(c.parse(42)).toBe("fallback");
    expect(c.parse("ok")).toBe("ok");
  });

  it(".describe() sets description", () => {
    const d = s.describe("A string field");
    expect(d.description).toBe("A string field");
  });

  it(".transform() transforms output", () => {
    const t = s.transform((v) => v.toUpperCase());
    expect(t).toBeInstanceOf(TransformSchema);
    expect(t.parse("hello")).toBe("HELLO");
  });

  it(".transform() async works", async () => {
    const t = s.transform(async (v) => v.toUpperCase());
    expect(await t.parseAsync("hello")).toBe("HELLO");
  });

  it(".refine() passes valid values", () => {
    const r = s.refine((v) => v.length > 2, "Too short");
    expect(r.parse("hello")).toBe("hello");
  });

  it(".refine() fails invalid values with message", () => {
    const r = s.refine((v) => v.length > 10, "Too short");
    const res = r.safeParse("hi");
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errors[0]!.message).toBe("Too short");
  });

  it(".refine() with function message", () => {
    const r = s.refine((v) => v.length > 10, (v) => `"${v}" is too short`);
    const res = r.safeParse("hi");
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errors[0]!.message).toContain('"hi"');
  });

  it(".refine() with async check", async () => {
    const r = s.refine(async (v) => v.length > 2, "Too short");
    await expect(r.parseAsync("hi")).rejects.toThrow();
    expect(await r.parseAsync("hello")).toBe("hello");
  });

  it(".superRefine() allows full control", () => {
    const r = s.superRefine((v, ctx) => {
      if (v.length < 3) ctx.addIssue({ code: "custom", message: "Min 3 chars" });
    });
    const res = r.safeParse("hi");
    expect(res.success).toBe(false);
  });

  it(".brand() creates branded type", () => {
    const branded = s.brand<"Email">();
    expect(branded).toBeInstanceOf(BrandedSchema);
    expect(branded.parse("test@test.com")).toBe("test@test.com");
  });

  it(".pipe() chains schemas", () => {
    const piped = s.pipe(string().min(1));
    expect(piped).toBeInstanceOf(PipelineSchema);
    expect(piped.parse("hello")).toBe("hello");
  });

  it(".pipe() fails on second schema", () => {
    const piped = s.pipe(string().min(100));
    expect(() => piped.parse("hi")).toThrow(ValiError);
  });

  it("ValiError thrown by parse has issues", () => {
    try {
      s.parse(42);
    } catch (e) {
      expect(e).toBeInstanceOf(ValiError);
      if (e instanceof ValiError) {
        expect(e.issues.length).toBeGreaterThan(0);
        expect(e.issues[0]!.code).toBe("invalid_type");
      }
    }
  });

  it("parse throws synchronously on async schema", () => {
    const asyncSchema = s.refine(async (v) => v.length > 0, "err");
    expect(() => asyncSchema.parse("hi")).toThrow("Use parseAsync");
  });
});
