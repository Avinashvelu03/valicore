import { describe, it, expect } from "vitest";
import { record, map, set } from "../../src/schemas/collections.js";
import { enumSchema, nativeEnum, promise, lazy, custom, preprocess } from "../../src/schemas/special.js";
import { string } from "../../src/schemas/string.js";
import { number } from "../../src/schemas/number.js";
import { object } from "../../src/schemas/object.js";
import { coerce } from "../../src/schemas/coerce.js";
import { ValiError } from "../../src/core/errors.js";
import type { Schema } from "../../src/core/schema.js";

describe("v.record()", () => {
  const r = record(string(), number());

  it("parses valid record", () => expect(r.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 }));
  it("parses empty record", () => expect(r.parse({})).toEqual({}));
  it("rejects non-object", () => expect(() => r.parse("string")).toThrow(ValiError));
  it("rejects array", () => expect(() => r.parse([1, 2])).toThrow());
  it("rejects null", () => expect(() => r.parse(null)).toThrow());
  it("validates values", () => expect(() => r.parse({ a: "not-a-number" })).toThrow());
  it("validates all values", () => {
    const res = r.safeParse({ a: 1, b: "bad", c: "also-bad" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errors.length).toBeGreaterThanOrEqual(2);
  });
  it("tracks error paths for values", () => {
    const res = r.safeParse({ a: "bad" });
    if (!res.success) expect(res.errors[0]!.path).toContain("a");
  });
});

describe("v.map()", () => {
  const m = map(string(), number());

  it("parses valid Map", () => {
    const input = new Map([["a", 1], ["b", 2]]);
    expect(m.parse(input)).toEqual(new Map([["a", 1], ["b", 2]]));
  });

  it("parses empty Map", () => expect(m.parse(new Map())).toEqual(new Map()));
  it("rejects non-Map", () => expect(() => m.parse({ a: 1 })).toThrow(ValiError));
  it("rejects null", () => expect(() => m.parse(null)).toThrow());
  it("validates keys", () => {
    expect(() => m.parse(new Map([[42 as unknown as string, 1]]))).toThrow();
  });
  it("validates values", () => {
    expect(() => m.parse(new Map([["a", "not-number" as unknown as number]]))).toThrow();
  });
});

describe("v.set()", () => {
  const s = set(string());

  it("parses valid Set", () => {
    const input = new Set(["a", "b"]);
    const result = s.parse(input);
    expect(result).toEqual(new Set(["a", "b"]));
  });

  it("parses empty Set", () => expect(s.parse(new Set())).toEqual(new Set()));
  it("rejects non-Set", () => expect(() => s.parse(["a", "b"])).toThrow(ValiError));
  it("rejects null", () => expect(() => s.parse(null)).toThrow());
  it("validates elements", () => expect(() => s.parse(new Set([1 as unknown as string]))).toThrow());

  describe(".min()", () => {
    it("accepts Set with enough elements", () => expect(s.min(2).parse(new Set(["a", "b"]))).toBeDefined());
    it("rejects too-small Set", () => expect(() => s.min(3).parse(new Set(["a"]))).toThrow());
  });

  describe(".max()", () => {
    it("accepts Set within limit", () => expect(s.max(3).parse(new Set(["a", "b"]))).toBeDefined());
    it("rejects too-large Set", () => expect(() => s.max(1).parse(new Set(["a", "b"]))).toThrow());
  });

  describe(".nonempty()", () => {
    it("accepts non-empty Set", () => expect(s.nonempty().parse(new Set(["a"]))).toBeDefined());
    it("rejects empty Set", () => expect(() => s.nonempty().parse(new Set())).toThrow());
  });

  describe(".size()", () => {
    it("accepts exact size", () => expect(s.size(2).parse(new Set(["a", "b"]))).toBeDefined());
    it("rejects wrong size", () => expect(() => s.size(3).parse(new Set(["a"]))).toThrow());
  });
});

describe("v.enum()", () => {
  const e = enumSchema(["admin", "user", "guest"]);

  it("accepts valid enum value", () => expect(e.parse("admin")).toBe("admin"));
  it("accepts all values", () => {
    expect(e.parse("user")).toBe("user");
    expect(e.parse("guest")).toBe("guest");
  });
  it("rejects invalid value", () => expect(() => e.parse("superuser")).toThrow(ValiError));
  it("rejects null", () => expect(() => e.parse(null)).toThrow());
  it("rejects number", () => expect(() => e.parse(0)).toThrow());
  it("error message lists valid options", () => {
    const r = e.safeParse("bad");
    if (!r.success) expect(r.errors[0]!.message).toContain("admin");
  });
  it("custom message", () => {
    const r = enumSchema(["a", "b"], "Must be a or b").safeParse("c");
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be a or b");
  });

  describe(".extract()", () => {
    it("creates sub-enum", () => {
      const sub = e.extract(["admin", "user"]);
      expect(sub.parse("admin")).toBe("admin");
      expect(() => sub.parse("guest")).toThrow();
    });
  });

  describe(".exclude()", () => {
    it("excludes values", () => {
      const filtered = e.exclude(["guest"]);
      expect(filtered.parse("admin")).toBe("admin");
      expect(() => filtered.parse("guest")).toThrow();
    });
  });
});

describe("v.nativeEnum()", () => {
  enum Direction { North = "NORTH", South = "SOUTH", East = "EAST", West = "WEST" }
  enum Status { Active = 1, Inactive = 0 }

  it("accepts string enum value", () => expect(nativeEnum(Direction).parse("NORTH")).toBe("NORTH"));
  it("accepts numeric enum value", () => expect(nativeEnum(Status).parse(1)).toBe(1));
  it("rejects invalid string", () => expect(() => nativeEnum(Direction).parse("UP")).toThrow());
  it("rejects invalid number", () => expect(() => nativeEnum(Status).parse(99)).toThrow());
  it("rejects null", () => expect(() => nativeEnum(Direction).parse(null)).toThrow());
});

describe("v.promise()", () => {
  const p = promise(string());

  it("accepts Promise", () => {
    const pr = Promise.resolve("hello");
    expect(p.parse(pr)).toBeInstanceOf(Promise);
  });

  it("returned promise resolves to validated value", async () => {
    const pr = Promise.resolve("hello");
    const result = p.parse(pr);
    expect(await result).toBe("hello");
  });

  it("returned promise rejects on invalid inner value", async () => {
    const pr = Promise.resolve(42 as unknown as string);
    const result = p.parse(pr);
    await expect(result).rejects.toThrow(ValiError);
  });

  it("rejects non-Promise", () => expect(() => p.parse("not a promise")).toThrow(ValiError));
});

describe("v.lazy()", () => {
  interface Node { value: string; child?: Node }
  type NodeSchema = Schema<Node>;
  const nodeSchema: NodeSchema = lazy(() =>
    object({ value: string(), child: nodeSchema.optional() })
  );

  it("parses simple recursive structure", () => {
    expect(nodeSchema.parse({ value: "root" })).toEqual({ value: "root" });
  });

  it("parses deeply nested structure", () => {
    const input = { value: "a", child: { value: "b", child: { value: "c" } } };
    expect(nodeSchema.parse(input)).toEqual(input);
  });

  it("validates nested values", () => {
    expect(() => nodeSchema.parse({ value: 42 })).toThrow();
  });

  it("validates nested child", () => {
    expect(() => nodeSchema.parse({ value: "root", child: { value: 123 } })).toThrow();
  });
});

describe("v.custom()", () => {
  const isEven = custom((v): v is number => typeof v === "number" && v % 2 === 0, "Must be even");

  it("accepts matching values", () => expect(isEven.parse(4)).toBe(4));
  it("rejects non-matching values", () => expect(() => isEven.parse(3)).toThrow());
  it("custom error message", () => {
    const r = isEven.safeParse(3);
    if (!r.success) expect(r.errors[0]!.message).toBe("Must be even");
  });
  it("rejects wrong type", () => expect(() => isEven.parse("four")).toThrow());
});

describe("v.preprocess()", () => {
  it("preprocesses before validation", () => {
    const schema = preprocess((v) => String(v), string().min(1));
    expect(schema.parse(42)).toBe("42");
    expect(schema.parse("hello")).toBe("hello");
  });

  it("validation runs after preprocessing", () => {
    const schema = preprocess((v) => Number(v), number().positive());
    expect(schema.parse("5")).toBe(5);
    expect(() => schema.parse("-3")).toThrow();
  });
});

describe("v.coerce", () => {
  describe(".string()", () => {
    it("coerces number to string", () => expect(coerce.string().parse(42)).toBe("42"));
    it("coerces boolean", () => expect(coerce.string().parse(true)).toBe("true"));
    it("coerces null to empty string", () => expect(coerce.string().parse(null)).toBe(""));
    it("coerces undefined to empty string", () => expect(coerce.string().parse(undefined)).toBe(""));
    it("passes through string", () => expect(coerce.string().parse("hello")).toBe("hello"));
  });

  describe(".number()", () => {
    it("coerces string to number", () => expect(coerce.number().parse("42")).toBe(42));
    it("coerces boolean true to 1", () => expect(coerce.number().parse(true)).toBe(1));
    it("coerces boolean false to 0", () => expect(coerce.number().parse(false)).toBe(0));
    it("coerces Date to timestamp", () => {
      const d = new Date("2023-01-01");
      expect(coerce.number().parse(d)).toBe(d.getTime());
    });
    it("passes through number", () => expect(coerce.number().parse(42)).toBe(42));
  });

  describe(".boolean()", () => {
    it("coerces truthy to true", () => expect(coerce.boolean().parse(1)).toBe(true));
    it("coerces falsy to false", () => expect(coerce.boolean().parse(0)).toBe(false));
    it("passes through boolean", () => expect(coerce.boolean().parse(true)).toBe(true));
  });

  describe(".date()", () => {
    it("coerces string to Date", () => {
      const result = coerce.date().parse("2023-01-01");
      expect(result).toBeInstanceOf(Date);
    });
    it("coerces number to Date", () => {
      const result = coerce.date().parse(1672531200000);
      expect(result).toBeInstanceOf(Date);
    });
    it("passes through Date", () => {
      const d = new Date();
      expect(coerce.date().parse(d)).toEqual(d);
    });
  });

  describe(".bigint()", () => {
    it("coerces string to bigint", () => expect(coerce.bigint().parse("42")).toBe(42n));
    it("coerces number to bigint", () => expect(coerce.bigint().parse(42)).toBe(42n));
    it("coerces boolean to bigint", () => expect(coerce.bigint().parse(true)).toBe(1n));
    it("passes through bigint", () => expect(coerce.bigint().parse(42n)).toBe(42n));
    it("fails on non-coercible value", () => expect(() => coerce.bigint().parse("abc")).toThrow());
  });
});
