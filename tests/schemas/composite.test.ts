import { describe, it, expect } from "vitest";
import { object } from "../../src/schemas/object.js";
import { array } from "../../src/schemas/array.js";
import { string } from "../../src/schemas/string.js";
import { number } from "../../src/schemas/number.js";
import { boolean } from "../../src/schemas/boolean.js";
import { literal } from "../../src/schemas/literal.js";
import { tuple, union, discriminatedUnion, intersection } from "../../src/schemas/composite.js";
import { ValiError } from "../../src/core/errors.js";

const userSchema = object({ name: string(), age: number().int().positive() });

describe("v.object()", () => {
  it("parses valid object", () => {
    expect(userSchema.parse({ name: "Alice", age: 30 })).toEqual({ name: "Alice", age: 30 });
  });

  it("rejects non-object", () => expect(() => userSchema.parse("string")).toThrow(ValiError));
  it("rejects array", () => expect(() => userSchema.parse([])).toThrow());
  it("rejects null", () => expect(() => userSchema.parse(null)).toThrow());
  it("rejects undefined", () => expect(() => userSchema.parse(undefined)).toThrow());

  it("strips unknown keys by default", () => {
    const r = userSchema.parse({ name: "Alice", age: 30, extra: "field" });
    expect((r as Record<string, unknown>)["extra"]).toBeUndefined();
  });

  it("reports all field errors", () => {
    const r = userSchema.safeParse({ name: 42, age: "old" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("tracks nested error paths", () => {
    const r = userSchema.safeParse({ name: 42, age: 30 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.path).toContain("name");
  });

  describe(".strict()", () => {
    const strict = userSchema.strict();
    it("rejects unknown keys", () => {
      expect(() => strict.parse({ name: "Alice", age: 30, extra: "x" })).toThrow();
    });
    it("accepts known keys", () => {
      expect(strict.parse({ name: "Alice", age: 30 })).toEqual({ name: "Alice", age: 30 });
    });
  });

  describe(".passthrough()", () => {
    const pt = userSchema.passthrough();
    it("keeps unknown keys", () => {
      const r = pt.parse({ name: "Alice", age: 30, extra: "x" });
      expect((r as Record<string, unknown>)["extra"]).toBe("x");
    });
  });

  describe(".partial()", () => {
    const partial = userSchema.partial();
    it("allows all fields to be undefined", () => {
      expect(partial.parse({})).toEqual({});
    });
    it("accepts partial data", () => {
      expect(partial.parse({ name: "Alice" })).toEqual({ name: "Alice" });
    });
    it("still validates provided fields", () => {
      expect(() => partial.parse({ name: 42 })).toThrow();
    });
  });

  describe(".pick()", () => {
    const picked = userSchema.pick(["name"]);
    it("includes picked fields", () => {
      expect(picked.parse({ name: "Alice" })).toEqual({ name: "Alice" });
    });
    it("strips other fields", () => {
      const r = picked.parse({ name: "Alice", age: 30 });
      expect((r as Record<string, unknown>)["age"]).toBeUndefined();
    });
    it("still validates picked fields", () => {
      expect(() => picked.parse({ name: 42 })).toThrow();
    });
  });

  describe(".omit()", () => {
    const omitted = userSchema.omit(["age"]);
    it("excludes omitted fields", () => {
      expect(omitted.parse({ name: "Alice" })).toEqual({ name: "Alice" });
    });
    it("does not require omitted fields", () => {
      expect(() => omitted.parse({ name: "Alice" })).not.toThrow();
    });
  });

  describe(".extend()", () => {
    const extended = userSchema.extend({ email: string().email() });
    it("includes extended fields", () => {
      expect(extended.parse({ name: "Alice", age: 30, email: "alice@example.com" })).toBeDefined();
    });
    it("validates extended fields", () => {
      expect(() => extended.parse({ name: "Alice", age: 30, email: "bad" })).toThrow();
    });
  });

  describe(".merge()", () => {
    const extra = object({ role: string() });
    const merged = userSchema.merge(extra);
    it("merges shapes", () => {
      expect(merged.parse({ name: "Alice", age: 30, role: "admin" })).toBeDefined();
    });
  });

  describe(".deepPartial()", () => {
    const nested = object({ user: object({ name: string(), age: number() }) });
    const dp = nested.deepPartial();
    it("makes all nested fields optional", () => {
      expect(dp.parse({})).toEqual({});
      expect(dp.parse({ user: {} })).toEqual({ user: {} });
      expect(dp.parse({ user: { name: "Alice" } })).toEqual({ user: { name: "Alice" } });
    });
  });

  describe("nested objects", () => {
    const nested = object({ address: object({ street: string(), city: string() }) });
    it("validates nested objects", () => {
      expect(nested.parse({ address: { street: "123 Main", city: "Anytown" } })).toBeDefined();
    });
    it("reports nested error paths", () => {
      const r = nested.safeParse({ address: { street: 42, city: "Anytown" } });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.errors[0]!.path).toEqual(["address", "street"]);
    });
  });

  describe("async object parsing", () => {
    it("parseAsync works for objects", async () => {
      expect(await userSchema.parseAsync({ name: "Alice", age: 30 })).toEqual({ name: "Alice", age: 30 });
    });
  });

  describe("edge cases", () => {
    it("handles empty shape", () => expect(object({}).parse({})).toEqual({}));
    it("handles prototype pollution attempt", () => {
      const r = userSchema.safeParse(JSON.parse('{"name":"Alice","age":30,"__proto__":{"admin":true}}'));
      // Should not crash
      expect(r).toBeDefined();
    });
  });
});

describe("v.array()", () => {
  const arr = array(string());

  it("parses valid array", () => expect(arr.parse(["a", "b"])).toEqual(["a", "b"]));
  it("parses empty array", () => expect(arr.parse([])).toEqual([]));
  it("rejects non-array", () => expect(() => arr.parse("string")).toThrow());
  it("rejects null", () => expect(() => arr.parse(null)).toThrow());
  it("validates each element", () => expect(() => arr.parse(["a", 2, "c"])).toThrow());
  it("reports element error path", () => {
    const r = arr.safeParse(["a", 2]);
    if (!r.success) expect(r.errors[0]!.path).toContain(1);
  });

  describe(".min()", () => {
    it("accepts at minimum", () => expect(arr.min(2).parse(["a", "b"])).toBeDefined());
    it("rejects below minimum", () => expect(() => arr.min(3).parse(["a", "b"])).toThrow());
  });

  describe(".max()", () => {
    it("accepts at maximum", () => expect(arr.max(2).parse(["a", "b"])).toBeDefined());
    it("rejects above maximum", () => expect(() => arr.max(1).parse(["a", "b"])).toThrow());
  });

  describe(".length()", () => {
    it("accepts exact length", () => expect(arr.length(2).parse(["a", "b"])).toBeDefined());
    it("rejects wrong length", () => expect(() => arr.length(3).parse(["a", "b"])).toThrow());
  });

  describe(".nonempty()", () => {
    it("accepts non-empty", () => expect(arr.nonempty().parse(["a"])).toBeDefined());
    it("rejects empty", () => expect(() => arr.nonempty().parse([])).toThrow());
  });

  describe(".unique()", () => {
    it("accepts unique array", () => expect(arr.unique().parse(["a", "b", "c"])).toBeDefined());
    it("rejects duplicate values", () => expect(() => arr.unique().parse(["a", "a", "b"])).toThrow());
    it("accepts single element", () => expect(arr.unique().parse(["a"])).toBeDefined());
    it("accepts empty array", () => expect(arr.unique().parse([])).toBeDefined());
  });

  describe("async array parsing", () => {
    it("parseAsync validates all elements", async () => {
      expect(await arr.parseAsync(["a", "b"])).toEqual(["a", "b"]);
    });
  });
});

describe("v.literal()", () => {
  it("accepts matching literal", () => expect(literal("active").parse("active")).toBe("active"));
  it("rejects non-matching", () => expect(() => literal("active").parse("inactive")).toThrow());
  it("works with numbers", () => expect(literal(42).parse(42)).toBe(42));
  it("works with booleans", () => expect(literal(true).parse(true)).toBe(true));
  it("works with null", () => expect(literal(null).parse(null)).toBeNull());
  it("custom message", () => {
    const r = literal("a", 'Must be "a"').safeParse("b");
    if (!r.success) expect(r.errors[0]!.message).toBe('Must be "a"');
  });
});

describe("v.tuple()", () => {
  const t = tuple([string(), number(), boolean()]);

  it("parses valid tuple", () => expect(t.parse(["hello", 42, true])).toEqual(["hello", 42, true]));
  it("rejects wrong length (too short)", () => expect(() => t.parse(["hello", 42])).toThrow());
  it("rejects wrong length (too long)", () => expect(() => t.parse(["hello", 42, true, "extra"])).toThrow());
  it("rejects wrong type at position", () => expect(() => t.parse([42, 42, true])).toThrow());
  it("rejects non-array", () => expect(() => t.parse("not array")).toThrow());
  it("tracks error position", () => {
    const r = t.safeParse(["hello", "not-number", true]);
    if (!r.success) expect(r.errors[0]!.path).toContain(1);
  });
});

describe("v.union()", () => {
  const u = union([string(), number()]);

  it("accepts first type", () => expect(u.parse("hello")).toBe("hello"));
  it("accepts second type", () => expect(u.parse(42)).toBe(42));
  it("rejects non-matching type", () => expect(() => u.parse(true)).toThrow());
  it("rejects null", () => expect(() => u.parse(null)).toThrow());
  it("union of literals", () => {
    const dir = union([literal("north"), literal("south"), literal("east"), literal("west")]);
    expect(dir.parse("north")).toBe("north");
    expect(() => dir.parse("up")).toThrow();
  });
});

describe("v.discriminatedUnion()", () => {
  const schema = discriminatedUnion("type", [
    object({ type: literal("cat"), meows: boolean() }),
    object({ type: literal("dog"), barks: boolean() }),
  ]);

  it("parses cat variant", () => expect(schema.parse({ type: "cat", meows: true })).toEqual({ type: "cat", meows: true }));
  it("parses dog variant", () => expect(schema.parse({ type: "dog", barks: false })).toEqual({ type: "dog", barks: false }));
  it("rejects invalid discriminator", () => expect(() => schema.parse({ type: "fish" })).toThrow());
  it("rejects non-object", () => expect(() => schema.parse("cat")).toThrow());
  it("validates the matched variant's fields", () => {
    expect(() => schema.parse({ type: "cat", meows: "yes" })).toThrow();
  });
});

describe("v.intersection()", () => {
  const hasName = object({ name: string() });
  const hasAge = object({ age: number() });
  const person = intersection(hasName, hasAge);

  it("accepts object matching both", () => {
    expect(person.parse({ name: "Alice", age: 30 })).toMatchObject({ name: "Alice", age: 30 });
  });

  it("rejects missing left field", () => expect(() => person.parse({ age: 30 })).toThrow());
  it("rejects missing right field", () => expect(() => person.parse({ name: "Alice" })).toThrow());
  it("rejects invalid types", () => expect(() => person.parse({ name: 42, age: 30 })).toThrow());

  it("works with primitives (equal values)", () => {
    const same = intersection(literal("admin"), literal("admin"));
    expect(same.parse("admin")).toBe("admin");
  });
});
