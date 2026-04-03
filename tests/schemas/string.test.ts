import { describe, it, expect } from "vitest";
import { string } from "../../src/schemas/string.js";
import { ValiError } from "../../src/core/errors.js";

describe("v.string()", () => {
  const s = string();

  it("parses valid strings", () => expect(s.parse("hello")).toBe("hello"));
  it("parses empty string", () => expect(s.parse("")).toBe(""));
  it("rejects undefined", () => expect(() => s.parse(undefined)).toThrow(ValiError));
  it("rejects null", () => expect(() => s.parse(null)).toThrow(ValiError));
  it("rejects numbers", () => expect(() => s.parse(42)).toThrow(ValiError));
  it("rejects booleans", () => expect(() => s.parse(true)).toThrow(ValiError));
  it("rejects objects", () => expect(() => s.parse({})).toThrow(ValiError));
  it("rejects arrays", () => expect(() => s.parse([])).toThrow(ValiError));
  it("rejects NaN", () => expect(() => s.parse(NaN)).toThrow(ValiError));
  it("rejects bigint", () => expect(() => s.parse(1n)).toThrow(ValiError));

  describe(".min()", () => {
    const s3 = s.min(3);
    it("accepts at minimum length", () => expect(s3.parse("abc")).toBe("abc"));
    it("accepts above minimum", () => expect(s3.parse("abcd")).toBe("abcd"));
    it("rejects below minimum", () => expect(() => s3.parse("ab")).toThrow());
    it("handles min(0)", () => expect(s.min(0).parse("")).toBe(""));
    it("uses default message", () => {
      const r = s3.safeParse("ab");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.errors[0]!.message).toContain("at least 3");
    });
    it("uses custom message", () => {
      const r = s.min(5, "Must be 5+").safeParse("hi");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.errors[0]!.message).toBe("Must be 5+");
    });
  });

  describe(".max()", () => {
    const s5 = s.max(5);
    it("accepts at maximum", () => expect(s5.parse("hello")).toBe("hello"));
    it("accepts below maximum", () => expect(s5.parse("hi")).toBe("hi"));
    it("rejects above maximum", () => expect(() => s5.parse("toolong")).toThrow());
    it("accepts empty string", () => expect(s5.parse("")).toBe(""));
    it("custom message", () => {
      const r = s.max(2, "Too long").safeParse("abc");
      if (!r.success) expect(r.errors[0]!.message).toBe("Too long");
    });
  });

  describe(".length()", () => {
    const s3 = s.length(3);
    it("accepts exact length", () => expect(s3.parse("abc")).toBe("abc"));
    it("rejects too short", () => expect(() => s3.parse("ab")).toThrow());
    it("rejects too long", () => expect(() => s3.parse("abcd")).toThrow());
    it("custom message", () => {
      const r = s.length(5, "Must be exactly 5").safeParse("hi");
      if (!r.success) expect(r.errors[0]!.message).toBe("Must be exactly 5");
    });
  });

  describe(".nonempty()", () => {
    const ne = s.nonempty();
    it("accepts non-empty string", () => expect(ne.parse("a")).toBe("a"));
    it("rejects empty string", () => expect(() => ne.parse("")).toThrow());
    it("custom message", () => {
      const r = s.nonempty("Required").safeParse("");
      if (!r.success) expect(r.errors[0]!.message).toBe("Required");
    });
  });

  describe(".email()", () => {
    const email = s.email();
    it("accepts valid email", () => expect(email.parse("user@example.com")).toBe("user@example.com"));
    it("accepts complex email", () => expect(email.parse("user+tag@sub.domain.co")).toBeDefined());
    it("rejects missing @", () => expect(() => email.parse("notanemail")).toThrow());
    it("rejects missing domain", () => expect(() => email.parse("user@")).toThrow());
    it("rejects double dot in local", () => expect(() => email.parse("user..name@example.com")).toThrow());
    it("custom message", () => {
      const r = s.email("Bad email").safeParse("bad");
      if (!r.success) expect(r.errors[0]!.message).toBe("Bad email");
    });
  });

  describe(".url()", () => {
    const url = s.url();
    it("accepts http URL", () => expect(url.parse("http://example.com")).toBeDefined());
    it("accepts https URL", () => expect(url.parse("https://example.com/path?q=1")).toBeDefined());
    it("accepts ftp URL", () => expect(url.parse("ftp://files.example.com")).toBeDefined());
    it("rejects bare domain", () => expect(() => url.parse("example.com")).toThrow());
    it("rejects empty", () => expect(() => url.parse("")).toThrow());
  });

  describe(".uuid()", () => {
    const uuid = s.uuid();
    it("accepts valid UUID v4", () => expect(uuid.parse("550e8400-e29b-41d4-a716-446655440000")).toBeDefined());
    it("accepts uppercase UUID", () => expect(uuid.parse("550E8400-E29B-41D4-A716-446655440000")).toBeDefined());
    it("rejects invalid format", () => expect(() => uuid.parse("not-a-uuid")).toThrow());
    it("rejects too short", () => expect(() => uuid.parse("550e8400")).toThrow());
  });

  describe(".cuid()", () => {
    const cuid = s.cuid();
    it("accepts valid CUID", () => expect(cuid.parse("cjld2cjxh0000qzrmn831i7rn")).toBeDefined());
    it("rejects non-cuid", () => expect(() => cuid.parse("notacuid")).toThrow());
  });

  describe(".cuid2()", () => {
    const cuid2 = s.cuid2();
    it("accepts valid cuid2", () => expect(cuid2.parse("tz4a98xxat96iws9zmbrgj3a")).toBeDefined());
    it("rejects uppercase", () => expect(() => cuid2.parse("UPPERCASE")).toThrow());
  });

  describe(".ulid()", () => {
    const ulid = s.ulid();
    it("accepts valid ULID", () => expect(ulid.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBeDefined());
    it("rejects invalid", () => expect(() => ulid.parse("not-a-ulid")).toThrow());
  });

  describe(".ip()", () => {
    const ip = s.ip();
    it("accepts IPv4", () => expect(ip.parse("192.168.1.1")).toBeDefined());
    it("accepts IPv6", () => expect(ip.parse("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBeDefined());
    it("rejects invalid", () => expect(() => ip.parse("999.999.999.999")).toThrow());
    it("v4 only rejects IPv6", () => expect(() => s.ip({ version: 4 }).parse("::1")).toThrow());
    it("v6 only rejects IPv4", () => expect(() => s.ip({ version: 6 }).parse("192.168.1.1")).toThrow());
    it("v4 accepts valid IPv4", () => expect(s.ip({ version: 4 }).parse("127.0.0.1")).toBeDefined());
    it("v6 accepts valid IPv6", () => expect(s.ip({ version: 6 }).parse("::1")).toBeDefined());
  });

  describe(".regex()", () => {
    const hex = s.regex(/^#[0-9a-f]{6}$/i);
    it("accepts matching string", () => expect(hex.parse("#ff0000")).toBeDefined());
    it("rejects non-matching", () => expect(() => hex.parse("red")).toThrow());
    it("custom message", () => {
      const r = s.regex(/^\d+$/, "Only digits").safeParse("abc");
      if (!r.success) expect(r.errors[0]!.message).toBe("Only digits");
    });
  });

  describe(".startsWith()", () => {
    const sw = s.startsWith("hello");
    it("accepts matching prefix", () => expect(sw.parse("hello world")).toBeDefined());
    it("rejects non-matching prefix", () => expect(() => sw.parse("world hello")).toThrow());
    it("custom message", () => {
      const r = s.startsWith("foo", "Must start with foo").safeParse("bar");
      if (!r.success) expect(r.errors[0]!.message).toBe("Must start with foo");
    });
  });

  describe(".endsWith()", () => {
    const ew = s.endsWith(".ts");
    it("accepts matching suffix", () => expect(ew.parse("index.ts")).toBeDefined());
    it("rejects non-matching suffix", () => expect(() => ew.parse("index.js")).toThrow());
  });

  describe(".includes()", () => {
    const inc = s.includes("admin");
    it("accepts containing string", () => expect(inc.parse("is_admin_user")).toBeDefined());
    it("rejects non-containing string", () => expect(() => inc.parse("regular_user")).toThrow());
  });

  describe(".trim()", () => {
    it("trims whitespace", () => expect(s.trim().parse("  hello  ")).toBe("hello"));
    it("leaves non-whitespace unchanged", () => expect(s.trim().parse("hello")).toBe("hello"));
    it("trims tabs and newlines", () => expect(s.trim().parse("\thello\n")).toBe("hello"));
  });

  describe(".toLowerCase()", () => {
    it("converts to lowercase", () => expect(s.toLowerCase().parse("HELLO")).toBe("hello"));
    it("handles mixed case", () => expect(s.toLowerCase().parse("HeLLo WoRLd")).toBe("hello world"));
  });

  describe(".toUpperCase()", () => {
    it("converts to uppercase", () => expect(s.toUpperCase().parse("hello")).toBe("HELLO"));
  });

  describe(".datetime()", () => {
    const dt = s.datetime();
    it("accepts valid ISO datetime", () => expect(dt.parse("2023-01-01T00:00:00Z")).toBeDefined());
    it("accepts datetime with offset", () => expect(dt.parse("2023-01-01T12:00:00+05:30")).toBeDefined());
    it("accepts datetime with ms", () => expect(dt.parse("2023-01-01T00:00:00.000Z")).toBeDefined());
    it("rejects date only", () => expect(() => dt.parse("2023-01-01")).toThrow());
    it("rejects invalid format", () => expect(() => dt.parse("not-a-date")).toThrow());
  });

  describe(".base64()", () => {
    const b64 = s.base64();
    it("accepts valid base64", () => expect(b64.parse("SGVsbG8gV29ybGQ=")).toBeDefined());
    it("accepts empty string", () => expect(b64.parse("")).toBeDefined());
    it("rejects invalid chars", () => expect(() => b64.parse("!!!")).toThrow());
  });

  describe("chaining", () => {
    it("chains min + max", () => {
      const schema = s.min(2).max(10);
      expect(schema.parse("hello")).toBe("hello");
      expect(() => schema.parse("a")).toThrow();
      expect(() => schema.parse("toolongstring!!")).toThrow();
    });

    it("chains trim + min", () => {
      const schema = s.trim().min(1);
      expect(schema.parse("  hello  ")).toBe("hello");
      expect(() => schema.parse("   ")).toThrow();
    });

    it("chains email + max", () => {
      const schema = s.email().max(50);
      expect(schema.parse("user@example.com")).toBeDefined();
      expect(() => schema.parse("notanemail")).toThrow();
    });
  });

  describe("unicode and special characters", () => {
    it("handles unicode", () => expect(s.parse("こんにちは")).toBe("こんにちは"));
    it("handles emoji in parse", () => expect(s.parse("hello 🌍")).toBe("hello 🌍"));
    it("handles null bytes", () => expect(s.parse("\0")).toBe("\0"));
    it("handles very long strings", () => {
      const long = "a".repeat(100_000);
      expect(s.parse(long)).toBe(long);
    });
  });
});
