import { describe, it, expect } from "vitest";
import { number } from "../../src/schemas/number.js";
import { boolean } from "../../src/schemas/boolean.js";
import { date } from "../../src/schemas/date.js";
import { bigint } from "../../src/schemas/bigint.js";
import { symbol, undefinedSchema, nullSchema, voidSchema, any, unknown, neverSchema, nan } from "../../src/schemas/primitives.js";
import { ValiError } from "../../src/core/errors.js";

describe("v.number()", () => {
  const n = number();

  it("parses valid numbers", () => expect(n.parse(42)).toBe(42));
  it("parses 0", () => expect(n.parse(0)).toBe(0));
  it("parses negative", () => expect(n.parse(-5)).toBe(-5));
  it("parses float", () => expect(n.parse(3.14)).toBe(3.14));
  it("rejects NaN", () => expect(() => n.parse(NaN)).toThrow(ValiError));
  it("rejects string", () => expect(() => n.parse("42")).toThrow());
  it("rejects null", () => expect(() => n.parse(null)).toThrow());
  it("rejects undefined", () => expect(() => n.parse(undefined)).toThrow());
  it("rejects boolean", () => expect(() => n.parse(true)).toThrow());
  it("parses Infinity", () => expect(n.parse(Infinity)).toBe(Infinity));
  it("parses -Infinity", () => expect(n.parse(-Infinity)).toBe(-Infinity));

  describe(".min()", () => {
    it("accepts at minimum", () => expect(n.min(5).parse(5)).toBe(5));
    it("rejects below minimum", () => expect(() => n.min(5).parse(4)).toThrow());
    it("accepts above minimum", () => expect(n.min(5).parse(10)).toBe(10));
    it("custom message", () => {
      const r = n.min(10, "Must be >= 10").safeParse(5);
      if (!r.success) expect(r.errors[0]!.message).toBe("Must be >= 10");
    });
  });

  describe(".max()", () => {
    it("accepts at maximum", () => expect(n.max(10).parse(10)).toBe(10));
    it("rejects above maximum", () => expect(() => n.max(10).parse(11)).toThrow());
    it("accepts below maximum", () => expect(n.max(10).parse(5)).toBe(5));
  });

  describe(".gt() / .lt() / .gte() / .lte()", () => {
    it("gt rejects equal", () => expect(() => n.gt(5).parse(5)).toThrow());
    it("gt accepts greater", () => expect(n.gt(5).parse(6)).toBe(6));
    it("lt rejects equal", () => expect(() => n.lt(5).parse(5)).toThrow());
    it("lt accepts less", () => expect(n.lt(5).parse(4)).toBe(4));
    it("gte accepts equal", () => expect(n.gte(5).parse(5)).toBe(5));
    it("lte accepts equal", () => expect(n.lte(5).parse(5)).toBe(5));
  });

  describe(".int()", () => {
    it("accepts integers", () => expect(n.int().parse(42)).toBe(42));
    it("rejects floats", () => expect(() => n.int().parse(3.14)).toThrow());
    it("accepts 0", () => expect(n.int().parse(0)).toBe(0));
    it("accepts negatives", () => expect(n.int().parse(-7)).toBe(-7));
  });

  describe(".positive()", () => {
    it("accepts positive", () => expect(n.positive().parse(1)).toBe(1));
    it("rejects 0", () => expect(() => n.positive().parse(0)).toThrow());
    it("rejects negative", () => expect(() => n.positive().parse(-1)).toThrow());
  });

  describe(".negative()", () => {
    it("accepts negative", () => expect(n.negative().parse(-1)).toBe(-1));
    it("rejects 0", () => expect(() => n.negative().parse(0)).toThrow());
    it("rejects positive", () => expect(() => n.negative().parse(1)).toThrow());
  });

  describe(".nonnegative()", () => {
    it("accepts 0", () => expect(n.nonnegative().parse(0)).toBe(0));
    it("accepts positive", () => expect(n.nonnegative().parse(1)).toBe(1));
    it("rejects negative", () => expect(() => n.nonnegative().parse(-1)).toThrow());
  });

  describe(".nonpositive()", () => {
    it("accepts 0", () => expect(n.nonpositive().parse(0)).toBe(0));
    it("accepts negative", () => expect(n.nonpositive().parse(-1)).toBe(-1));
    it("rejects positive", () => expect(() => n.nonpositive().parse(1)).toThrow());
  });

  describe(".finite()", () => {
    it("accepts finite number", () => expect(n.finite().parse(42)).toBe(42));
    it("rejects Infinity", () => expect(() => n.finite().parse(Infinity)).toThrow());
    it("rejects -Infinity", () => expect(() => n.finite().parse(-Infinity)).toThrow());
  });

  describe(".safe()", () => {
    it("accepts safe integer", () => expect(n.safe().parse(42)).toBe(42));
    it("rejects too large", () => expect(() => n.safe().parse(Number.MAX_SAFE_INTEGER + 1)).toThrow());
    it("rejects float", () => expect(() => n.safe().parse(3.14)).toThrow());
  });

  describe(".multipleOf() / .step()", () => {
    it("accepts multiple", () => expect(n.multipleOf(5).parse(15)).toBe(15));
    it("rejects non-multiple", () => expect(() => n.multipleOf(5).parse(7)).toThrow());
    it("step is alias for multipleOf", () => expect(n.step(3).parse(9)).toBe(9));
    it("accepts 0 as multiple of any", () => expect(n.multipleOf(5).parse(0)).toBe(0));
  });

  describe(".between()", () => {
    it("accepts in range", () => expect(n.between(1, 10).parse(5)).toBe(5));
    it("accepts at bounds", () => {
      expect(n.between(1, 10).parse(1)).toBe(1);
      expect(n.between(1, 10).parse(10)).toBe(10);
    });
    it("rejects out of range", () => {
      expect(() => n.between(1, 10).parse(0)).toThrow();
      expect(() => n.between(1, 10).parse(11)).toThrow();
    });
  });

  describe(".port()", () => {
    it("accepts valid port", () => expect(n.port().parse(8080)).toBe(8080));
    it("accepts 0", () => expect(n.port().parse(0)).toBe(0));
    it("accepts 65535", () => expect(n.port().parse(65535)).toBe(65535));
    it("rejects 65536", () => expect(() => n.port().parse(65536)).toThrow());
    it("rejects negative", () => expect(() => n.port().parse(-1)).toThrow());
    it("rejects float", () => expect(() => n.port().parse(80.5)).toThrow());
  });
});

describe("v.boolean()", () => {
  const b = boolean();
  it("parses true", () => expect(b.parse(true)).toBe(true));
  it("parses false", () => expect(b.parse(false)).toBe(false));
  it("rejects string", () => expect(() => b.parse("true")).toThrow());
  it("rejects number", () => expect(() => b.parse(1)).toThrow());
  it("rejects null", () => expect(() => b.parse(null)).toThrow());
  it("rejects undefined", () => expect(() => b.parse(undefined)).toThrow());

  describe(".true()", () => {
    it("accepts true", () => expect(b.true().parse(true)).toBe(true));
    it("rejects false", () => expect(() => b.true().parse(false)).toThrow());
  });

  describe(".false()", () => {
    it("accepts false", () => expect(b.false().parse(false)).toBe(false));
    it("rejects true", () => expect(() => b.false().parse(true)).toThrow());
  });

  describe(".coerce()", () => {
    it("coerces truthy values", () => expect(b.coerce().parse(1)).toBe(true));
    it("coerces falsy values", () => expect(b.coerce().parse(0)).toBe(false));
    it("coerces non-empty string", () => expect(b.coerce().parse("hello")).toBe(true));
    it("coerces empty string to false", () => expect(b.coerce().parse("")).toBe(false));
  });
});

describe("v.date()", () => {
  const d = date();
  const now = new Date();
  it("parses valid Date", () => expect(d.parse(now)).toEqual(now));
  it("rejects string", () => expect(() => d.parse("2023-01-01")).toThrow());
  it("rejects number", () => expect(() => d.parse(1234567890)).toThrow());
  it("rejects null", () => expect(() => d.parse(null)).toThrow());
  it("rejects invalid Date", () => expect(() => d.parse(new Date("invalid"))).toThrow());

  describe(".min()", () => {
    const minDate = new Date("2020-01-01");
    it("accepts on or after min", () => expect(d.min(minDate).parse(new Date("2021-01-01"))).toBeDefined());
    it("rejects before min", () => expect(() => d.min(minDate).parse(new Date("2019-01-01"))).toThrow());
    it("accepts equal to min", () => expect(d.min(minDate).parse(new Date("2020-01-01"))).toBeDefined());
  });

  describe(".max()", () => {
    const maxDate = new Date("2030-01-01");
    it("accepts on or before max", () => expect(d.max(maxDate).parse(new Date("2025-01-01"))).toBeDefined());
    it("rejects after max", () => expect(() => d.max(maxDate).parse(new Date("2031-01-01"))).toThrow());
  });

  describe(".past()", () => {
    it("accepts past dates", () => expect(d.past().parse(new Date("2000-01-01"))).toBeDefined());
    it("rejects future dates", () => expect(() => d.past().parse(new Date("2099-01-01"))).toThrow());
  });

  describe(".future()", () => {
    it("accepts future dates", () => expect(d.future().parse(new Date("2099-01-01"))).toBeDefined());
    it("rejects past dates", () => expect(() => d.future().parse(new Date("2000-01-01"))).toThrow());
  });
});

describe("v.bigint()", () => {
  const bi = bigint();
  it("parses bigint", () => expect(bi.parse(42n)).toBe(42n));
  it("parses 0n", () => expect(bi.parse(0n)).toBe(0n));
  it("parses negative", () => expect(bi.parse(-42n)).toBe(-42n));
  it("rejects number", () => expect(() => bi.parse(42)).toThrow());
  it("rejects string", () => expect(() => bi.parse("42")).toThrow());
  it("rejects null", () => expect(() => bi.parse(null)).toThrow());

  describe(".positive()", () => {
    it("accepts positive", () => expect(bi.positive().parse(1n)).toBe(1n));
    it("rejects 0", () => expect(() => bi.positive().parse(0n)).toThrow());
    it("rejects negative", () => expect(() => bi.positive().parse(-1n)).toThrow());
  });

  describe(".negative()", () => {
    it("accepts negative", () => expect(bi.negative().parse(-1n)).toBe(-1n));
    it("rejects 0", () => expect(() => bi.negative().parse(0n)).toThrow());
  });

  describe(".min() / .max()", () => {
    it("min accepts at boundary", () => expect(bi.min(5n).parse(5n)).toBe(5n));
    it("min rejects below", () => expect(() => bi.min(5n).parse(4n)).toThrow());
    it("max accepts at boundary", () => expect(bi.max(10n).parse(10n)).toBe(10n));
    it("max rejects above", () => expect(() => bi.max(10n).parse(11n)).toThrow());
  });

  describe(".multipleOf()", () => {
    it("accepts multiple", () => expect(bi.multipleOf(3n).parse(9n)).toBe(9n));
    it("rejects non-multiple", () => expect(() => bi.multipleOf(3n).parse(7n)).toThrow());
  });
});

describe("v.symbol()", () => {
  const s = symbol();
  it("accepts symbol", () => { const sym = Symbol("test"); expect(s.parse(sym)).toBe(sym); });
  it("rejects string", () => expect(() => s.parse("sym")).toThrow());
  it("rejects number", () => expect(() => s.parse(1)).toThrow());
});

describe("v.undefined()", () => {
  const u = undefinedSchema();
  it("accepts undefined", () => expect(u.parse(undefined)).toBeUndefined());
  it("rejects null", () => expect(() => u.parse(null)).toThrow());
  it("rejects string", () => expect(() => u.parse("")).toThrow());
});

describe("v.null()", () => {
  const n = nullSchema();
  it("accepts null", () => expect(n.parse(null)).toBeNull());
  it("rejects undefined", () => expect(() => n.parse(undefined)).toThrow());
  it("rejects string", () => expect(() => n.parse("null")).toThrow());
});

describe("v.void()", () => {
  const v = voidSchema();
  it("accepts undefined", () => expect(v.parse(undefined)).toBeUndefined());
  it("accepts null", () => expect(v.parse(null)).toBeNull());
  it("rejects string", () => expect(() => v.parse("")).toThrow());
  it("rejects number", () => expect(() => v.parse(0)).toThrow());
});

describe("v.any()", () => {
  const a = any();
  it("accepts any value", () => {
    expect(a.parse("hi")).toBe("hi");
    expect(a.parse(42)).toBe(42);
    expect(a.parse(null)).toBeNull();
    expect(a.parse(undefined)).toBeUndefined();
    expect(a.parse({})).toEqual({});
    expect(a.parse([])).toEqual([]);
  });
});

describe("v.unknown()", () => {
  const u = unknown();
  it("accepts any value", () => {
    expect(u.parse("hi")).toBe("hi");
    expect(u.parse(null)).toBeNull();
    expect(u.parse(undefined)).toBeUndefined();
    expect(u.parse(Symbol())).toBeDefined();
  });
});

describe("v.never()", () => {
  const n = neverSchema();
  it("rejects everything", () => {
    expect(() => n.parse("hi")).toThrow();
    expect(() => n.parse(42)).toThrow();
    expect(() => n.parse(null)).toThrow();
    expect(() => n.parse(undefined)).toThrow();
    expect(() => n.parse({})).toThrow();
  });
});

describe("v.nan()", () => {
  const na = nan();
  it("accepts NaN", () => expect(na.parse(NaN)).toBeNaN());
  it("rejects regular number", () => expect(() => na.parse(42)).toThrow());
  it("rejects string", () => expect(() => na.parse("NaN")).toThrow());
  it("rejects null", () => expect(() => na.parse(null)).toThrow());
});
