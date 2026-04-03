/**
 * Final 100% coverage tests - exhausts every remaining branch
 */
import { describe, it, expect } from "vitest";
import { string as str } from "../../src/schemas/string.js";
import { number as num } from "../../src/schemas/number.js";
import { object as obj } from "../../src/schemas/object.js";
import { tuple } from "../../src/schemas/composite.js";
import { map as mp } from "../../src/schemas/collections.js";
import { union as un } from "../../src/schemas/composite.js";

// ─── schema.ts branches 49,51: addIssue with missing code/message ───────────
// These ?? fallbacks fire when addIssue is called without code or message
describe("addIssue with missing code and message (schema.ts lines 49,51)", () => {
  it("superRefine addIssue with no code falls back to 'custom'", () => {
    const schema = str().superRefine((v, ctx) => {
      // addIssue with only message, no code
      ctx.addIssue({ message: "No code provided" } as Parameters<typeof ctx.addIssue>[0]);
    });
    const r = schema.safeParse("test");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.code).toBe("custom");
  });

  it("superRefine addIssue with no message falls back to 'Invalid value'", () => {
    const schema = str().superRefine((v, ctx) => {
      // addIssue with only code, no message
      ctx.addIssue({ code: "custom" } as Parameters<typeof ctx.addIssue>[0]);
    });
    const r = schema.safeParse("test");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Invalid value");
  });

  it("superRefine addIssue with explicit path overrides ctx path", () => {
    const schema = obj({ name: str() }).superRefine((_v, ctx) => {
      ctx.addIssue({ code: "custom", message: "Custom path", path: ["custom", "path"] });
    });
    const r = schema.safeParse({ name: "Alice" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors[0]!.path).toEqual(["custom", "path"]);
    }
  });

  it("superRefine addIssue with no path uses ctx path (line 50 false branch)", () => {
    const schema = str().superRefine((v, ctx) => {
      // addIssue with no path - path should be undefined and falls back to ctx.path
      ctx.addIssue({ code: "custom", message: "No path" });
    });
    const r = schema.safeParse("test");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.path).toEqual([]);
  });
});

// ─── schema.ts line 68: async refinements with fatal() ──────────────────────
describe("async fatal() refinement stops remaining refinements (line 68)", () => {
  it("fatal() in async superRefine stops subsequent refinements", async () => {
    const order: number[] = [];
    const schema = str()
      .superRefine(async (_v, ctx) => {
        order.push(1);
        ctx.fatal();
        ctx.addIssue({ code: "custom", message: "Fatal error" });
      })
      .superRefine(async (_v) => {
        order.push(2); // should NOT run
      });
    const r = await schema.safeParseAsync("test");
    expect(r.success).toBe(false);
    expect(order).toEqual([1]);
  });
});

// ─── schema.ts line 84: safeParse on async schema throws ────────────────────
describe("safeParse throws for async schema (line 84)", () => {
  it("calling safeParse on async schema throws synchronously", () => {
    const schema = str().refine(async (v) => v.length > 0, "err");
    expect(() => schema.safeParse("hi")).toThrow("Use safeParseAsync");
  });
});

// ─── composite.ts lines 56-62: TupleSchema async elements ────────────────────
describe("TupleSchema async elements (lines 56-62)", () => {
  it("tuple with async element validates correctly", async () => {
    const schema = tuple([
      str().refine(async (v) => v.length > 0, "Empty"),
      num().refine(async (v) => v > 0, "Positive"),
    ]);
    const r = await schema.parseAsync(["hello", 42]);
    expect(r).toEqual(["hello", 42]);
  });

  it("tuple with failing async element reports error", async () => {
    const schema = tuple([
      str().refine(async (v) => v.length > 0, "Empty"),
      num().refine(async (v) => v > 0, "Positive"),
    ]);
    const r = await schema.safeParseAsync(["hello", -1]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Positive");
  });

  it("tuple async path: errors.push on failure (line 61)", async () => {
    const schema = tuple([
      str().refine(async (_v) => false, "Always fails"),
    ]);
    const r = await schema.safeParseAsync(["test"]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Always fails");
  });

  it("tuple async path: isOk sets result (line 60)", async () => {
    const schema = tuple([
      str().refine(async (_v) => true, "Always passes"),
      num(),
    ]);
    const r = await schema.parseAsync(["hello", 1]);
    expect(r[0]).toBe("hello");
    expect(r[1]).toBe(1);
  });
});

// ─── composite.ts lines 70-73: TupleSchema async success path ───────────────
describe("TupleSchema async full success (lines 70-73)", () => {
  it("all async elements succeed — full async path", async () => {
    const schema = tuple([
      str().transform(async (v) => v.toUpperCase()),
      num().transform(async (v) => v * 2),
    ]);
    const r = await schema.parseAsync(["hello", 5]);
    expect(r).toEqual(["HELLO", 10]);
  });
});

// ─── composite.ts lines 135-141: UnionSchema async _parseAsync failure ───────
describe("UnionSchema _parseAsync all options fail (lines 135-141)", () => {
  it("async union where all options fail returns invalid_union", async () => {
    const schema = un([
      str().refine(async (v) => v.length > 10, "Too short string"),
      num().refine(async (v) => v > 100, "Too small number"),
    ]);
    // Input "hi" fails string (too short) and fails number (not a number)
    const r = await schema.safeParseAsync("hi");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.code).toBe("invalid_union");
  });

  it("async union second option succeeds", async () => {
    const schema = un([
      str().refine(async (v) => v.length > 10, "Too short"),
      str().refine(async (v) => v.length > 0, "Empty"),
    ]);
    // "hello" fails first (too short), succeeds second
    const r = await schema.parseAsync("hello");
    expect(r).toBe("hello");
  });
});

// ─── collections.ts line 141: MapSchema async where key or value is async ───
describe("MapSchema async validation path (line 141)", () => {
  it("async map key schema path — key fails", async () => {
    const schema = mp(
      str().refine(async (k) => k.length > 2, "Key too short"),
      num()
    );
    const r = await schema.safeParseAsync(new Map([["ab", 1]]));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Key too short");
  });

  it("async map value schema path — value fails", async () => {
    const schema = mp(
      str(),
      num().refine(async (v) => v > 0, "Positive required")
    );
    const r = await schema.safeParseAsync(new Map([["key", -5]]));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Positive required");
  });

  it("async map both succeed", async () => {
    const schema = mp(
      str().refine(async (k) => k.length > 0, "Non-empty key"),
      num().refine(async (v) => v >= 0, "Non-negative")
    );
    const r = await schema.parseAsync(new Map([["key", 5]]));
    expect(r.get("key")).toBe(5);
  });
});

// ─── object.ts: object _clone preserves _unknownKeys ────────────────────────
describe("object _clone preserves unknownKeys setting", () => {
  it("cloned strict schema is still strict", () => {
    const base = obj({ name: str() }).strict();
    const cloned = base.describe("strict object");
    expect(() => cloned.parse({ name: "Alice", extra: "x" })).toThrow();
  });

  it("cloned passthrough schema still passes through", () => {
    const base = obj({ name: str() }).passthrough();
    const cloned = base.describe("passthrough object");
    const r = cloned.parse({ name: "Alice", extra: "x" }) as Record<string, unknown>;
    expect(r["extra"]).toBe("x");
  });
});

// ─── Ensure object.ts: private method _addCheck is covered for all schemas ──
describe("Chainability immutability for schemas with _addCheck", () => {
  it("string schema _addCheck creates new instance", () => {
    const a = str();
    const b = a.min(1);
    const c = a.max(10);
    expect(b).not.toBe(a);
    expect(c).not.toBe(a);
    expect(b).not.toBe(c);
    // original schema unchanged
    expect(a.parse("")).toBe("");
  });
});
