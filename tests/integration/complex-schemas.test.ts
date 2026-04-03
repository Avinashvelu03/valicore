import { describe, it, expect } from "vitest";
import { object } from "../../src/schemas/object.js";
import { array } from "../../src/schemas/array.js";
import { string } from "../../src/schemas/string.js";
import { number } from "../../src/schemas/number.js";
import { boolean } from "../../src/schemas/boolean.js";
import { literal } from "../../src/schemas/literal.js";
import { union } from "../../src/schemas/composite.js";
import { enumSchema } from "../../src/schemas/special.js";
import { lazy } from "../../src/schemas/special.js";
import { ValiError } from "../../src/core/errors.js";
import { toJSONSchema } from "../../src/plugins/jsonSchema.js";
import { toOpenAPI } from "../../src/plugins/openapi.js";
import { deepMerge, deepClone, isPlainObject, formatPath, formatValue } from "../../src/utils/index.js";
import type { Schema } from "../../src/core/schema.js";

describe("Complex real-world schemas", () => {
  const addressSchema = object({
    street: string().min(1),
    city: string().min(1),
    country: string().length(2),
    postalCode: string().regex(/^\d{5}$/),
  });

  const userSchema = object({
    id: string().uuid(),
    email: string().email(),
    age: number().int().min(0).max(150),
    role: enumSchema(["admin", "user", "guest"]),
    address: addressSchema.optional(),
    tags: array(string()).max(10),
  });

  it("validates a complete user object", () => {
    const user = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "alice@example.com",
      age: 30,
      role: "admin",
      tags: ["typescript", "developer"],
    };
    expect(userSchema.parse(user)).toMatchObject(user);
  });

  it("validates user with optional address", () => {
    const user = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "alice@example.com",
      age: 30,
      role: "user",
      tags: [],
      address: { street: "123 Main St", city: "Springfield", country: "US", postalCode: "12345" },
    };
    expect(userSchema.parse(user)).toBeDefined();
  });

  it("reports multiple nested errors", () => {
    const user = { id: "bad-uuid", email: "not-an-email", age: -1, role: "superuser", tags: [] };
    const r = userSchema.safeParse(user);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("flattens errors for form display", () => {
    const r = userSchema.safeParse({ id: "bad", email: "bad", age: -1, role: "x", tags: [] });
    if (!r.success) {
      const err = new ValiError(r.errors);
      const { fieldErrors } = err.flatten();
      expect(fieldErrors["id"]).toBeDefined();
      expect(fieldErrors["email"]).toBeDefined();
    }
  });
});

describe("Async validation", () => {
  it("validates async with refinement", async () => {
    const schema = string().refine(
      async (v) => {
        await new Promise((r) => setTimeout(r, 1));
        return v.includes("@");
      },
      "Must contain @"
    );
    await expect(schema.parseAsync("user@example.com")).resolves.toBe("user@example.com");
    await expect(schema.parseAsync("notanemail")).rejects.toThrow(ValiError);
  });

  it("validates async object fields", async () => {
    const schema = object({
      username: string().refine(async (v) => {
        await new Promise((r) => setTimeout(r, 1));
        return v.length > 3;
      }, "Too short"),
    });
    await expect(schema.parseAsync({ username: "alice" })).resolves.toBeDefined();
    await expect(schema.parseAsync({ username: "al" })).rejects.toThrow();
  });

  it("safeParseAsync returns failure on async error", async () => {
    const schema = number().refine(async (v) => v > 0, "Must be positive");
    const r = await schema.safeParseAsync(-1);
    expect(r.success).toBe(false);
  });
});

describe("Transform and refine pipeline", () => {
  it("transforms and then validates", () => {
    const schema = string()
      .transform((v) => v.trim().toLowerCase())
      .pipe(string().email());
    expect(schema.parse("  USER@EXAMPLE.COM  ")).toBe("user@example.com");
  });

  it("transform chain", () => {
    const schema = string()
      .transform((v) => v.length)
      .pipe(number().max(10));
    expect(schema.parse("hello")).toBe(5);
    expect(() => schema.parse("toolongstring")).toThrow();
  });

  it("refine chain with superRefine", () => {
    const schema = object({
      password: string().min(8),
      confirmPassword: string(),
    }).superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", message: "Passwords must match", path: ["confirmPassword"] });
      }
    });
    expect(schema.parse({ password: "password123", confirmPassword: "password123" })).toBeDefined();
    const r = schema.safeParse({ password: "password123", confirmPassword: "different" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.path).toContain("confirmPassword");
  });
});

describe("Recursive schemas", () => {
  interface Category { name: string; subcategories?: Category[] }
  type CategorySchema = Schema<Category>;

  const categorySchema: CategorySchema = lazy(() =>
    object({
      name: string(),
      subcategories: array(categorySchema).optional(),
    })
  );

  it("parses leaf node", () => expect(categorySchema.parse({ name: "Leaf" })).toEqual({ name: "Leaf" }));

  it("parses deeply nested", () => {
    const input = {
      name: "Root",
      subcategories: [
        { name: "Child1", subcategories: [{ name: "Grandchild" }] },
        { name: "Child2" },
      ],
    };
    expect(categorySchema.parse(input)).toEqual(input);
  });

  it("validates nested values", () => {
    expect(() => categorySchema.parse({ name: "Root", subcategories: [{ name: 42 }] })).toThrow();
  });
});

describe("JSON Schema plugin", () => {
  it("converts string schema", () => {
    const js = toJSONSchema(string());
    expect(js.type).toBe("string");
    expect(js.$schema).toBeDefined();
  });

  it("converts number schema", () => {
    expect(toJSONSchema(number()).type).toBe("number");
  });

  it("converts boolean schema", () => {
    expect(toJSONSchema(boolean()).type).toBe("boolean");
  });

  it("converts object schema with required fields", () => {
    const schema = object({ name: string(), age: number() });
    const js = toJSONSchema(schema);
    expect(js.type).toBe("object");
    expect(js.properties?.["name"]?.type).toBe("string");
    expect(js.required).toContain("name");
    expect(js.required).toContain("age");
  });

  it("converts optional fields as non-required", () => {
    const schema = object({ name: string(), nickname: string().optional() });
    const js = toJSONSchema(schema);
    expect(js.required).toContain("name");
    expect(js.required).not.toContain("nickname");
  });

  it("converts array schema", () => {
    const js = toJSONSchema(array(string()));
    expect(js.type).toBe("array");
    expect(js.items?.type).toBe("string");
  });

  it("converts union schema", () => {
    const js = toJSONSchema(union([string(), number()]));
    expect(js.anyOf).toHaveLength(2);
  });

  it("converts literal schema", () => {
    const js = toJSONSchema(literal("active"));
    expect(js.const).toBe("active");
  });

  it("converts nullable schema", () => {
    const js = toJSONSchema(string().nullable());
    expect(js.anyOf).toBeDefined();
  });

  it("converts enum schema", () => {
    const js = toJSONSchema(enumSchema(["a", "b", "c"]));
    expect(js.enum).toEqual(["a", "b", "c"]);
  });

  it("preserves description", () => {
    const js = toJSONSchema(string().describe("A name field"));
    expect(js.description).toBe("A name field");
  });
});

describe("OpenAPI plugin", () => {
  it("converts schema to OpenAPI format", () => {
    const spec = toOpenAPI(string());
    expect(spec.type).toBe("string");
    expect(spec.$schema).toBeUndefined();
  });

  it("adds description from options", () => {
    const spec = toOpenAPI(string(), { description: "A string field" });
    expect(spec.description).toBe("A string field");
  });

  it("adds example from options", () => {
    const spec = toOpenAPI(string(), { example: "hello" });
    expect(spec.example).toBe("hello");
  });
});

describe("Utils", () => {
  describe("deepMerge", () => {
    it("merges flat objects", () => {
      expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    });
    it("source overwrites target", () => {
      expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
    });
    it("deeply merges nested objects", () => {
      expect(deepMerge({ a: { x: 1 } }, { a: { y: 2 } })).toEqual({ a: { x: 1, y: 2 } });
    });
    it("does not deep merge arrays", () => {
      expect(deepMerge({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
    });
  });

  describe("deepClone", () => {
    it("clones primitives", () => expect(deepClone(42)).toBe(42));
    it("clones arrays", () => { const a = [1, 2, 3]; const c = deepClone(a); expect(c).toEqual(a); expect(c).not.toBe(a); });
    it("clones objects", () => { const o = { a: 1, b: { c: 2 } }; const c = deepClone(o); expect(c).toEqual(o); expect(c).not.toBe(o); });
    it("clones Date", () => { const d = new Date(); const c = deepClone(d); expect(c).toEqual(d); expect(c).not.toBe(d); });
    it("clones Map", () => { const m = new Map([["a", 1]]); const c = deepClone(m); expect(c).toEqual(m); expect(c).not.toBe(m); });
    it("clones Set", () => { const s = new Set([1, 2]); const c = deepClone(s); expect(c).toEqual(s); expect(c).not.toBe(s); });
    it("clones null", () => expect(deepClone(null)).toBeNull());
  });

  describe("isPlainObject", () => {
    it("returns true for plain objects", () => expect(isPlainObject({})).toBe(true));
    it("returns true for null-proto objects", () => expect(isPlainObject(Object.create(null))).toBe(true));
    it("returns false for arrays", () => expect(isPlainObject([])).toBe(false));
    it("returns false for null", () => expect(isPlainObject(null)).toBe(false));
    it("returns false for class instances", () => expect(isPlainObject(new Date())).toBe(false));
  });

  describe("formatPath", () => {
    it("formats empty path as root", () => expect(formatPath([])).toBe("(root)"));
    it("formats simple key", () => expect(formatPath(["name"])).toBe("name"));
    it("formats nested keys with dot", () => expect(formatPath(["a", "b"])).toBe("a.b"));
    it("formats array index with brackets", () => expect(formatPath(["items", 0])).toBe("items[0]"));
  });

  describe("formatValue", () => {
    it("formats undefined", () => expect(formatValue(undefined)).toBe("undefined"));
    it("formats null", () => expect(formatValue(null)).toBe("null"));
    it("formats string with quotes", () => expect(formatValue("hi")).toBe('"hi"'));
    it("formats number", () => expect(formatValue(42)).toBe("42"));
    it("formats bigint", () => expect(formatValue(42n)).toBe("42n"));
    it("formats array", () => expect(formatValue([1, 2])).toBe("[1, 2]"));
    it("formats object", () => expect(formatValue({})).toBe("[object]"));
    it("formats Date as ISO string", () => {
      const d = new Date("2023-01-01T00:00:00.000Z");
      expect(formatValue(d)).toBe(d.toISOString());
    });
  });
});

describe("Edge cases", () => {
  it("handles very large arrays", () => {
    const schema = array(number());
    const large = Array.from({ length: 10_000 }, (_, i) => i);
    expect(schema.parse(large)).toHaveLength(10_000);
  });

  it("handles deeply nested objects", () => {
    let schema: any = object({ value: string() });
    for (let i = 0; i < 10; i++) schema = object({ nested: schema });
    let data: any = { value: "deep" };
    for (let i = 0; i < 10; i++) data = { nested: data };
    expect(schema.parse(data)).toBeDefined();
  });

  it("handles NaN in array", () => {
    const schema = array(number());
    expect(() => schema.parse([1, NaN, 3])).toThrow();
  });

  it("schema methods return new instances (immutability)", () => {
    const base = string();
    const minned = base.min(1);
    const maxed = base.max(100);
    expect(minned).not.toBe(base);
    expect(maxed).not.toBe(base);
    expect(minned).not.toBe(maxed);
  });

  it("handles Infinity in number schema", () => {
    expect(number().parse(Infinity)).toBe(Infinity);
    expect(() => number().finite().parse(Infinity)).toThrow();
  });

  it("handles special unicode in strings", () => {
    expect(string().parse("𝕳𝖊𝖑𝖑𝖔")).toBe("𝕳𝖊𝖑𝖑𝖔");
  });

  it("union with default fallback", () => {
    const schema = union([string(), number()]).catch("fallback");
    expect(schema.parse(true)).toBe("fallback");
  });
});
