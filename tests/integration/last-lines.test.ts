/**
 * Final absolute coverage tests — hits every last line, branch, and function
 */
import { describe, it, expect } from "vitest";
import { string as str } from "../../src/schemas/string.js";
import { number as num } from "../../src/schemas/number.js";
import { object as obj } from "../../src/schemas/object.js";
import { intersection as intr, discriminatedUnion as du } from "../../src/schemas/composite.js";

// ─── composite.ts line 214: discriminatedUnion async option that SUCCEEDS ────
// Line 214 is `if (isOk(r)) return r` inside the async promise callback
// We need an async option that succeeds in the fallback-scanning path
describe("discriminatedUnion async option succeeds (line 214)", () => {
  it("falls back to scan, async option succeeds", async () => {
    // Use a schema without a literal discriminator so it won't go into optionMap
    // but the option's _parse returns Promise (due to async refinement) and succeeds
    const asyncOption = obj({
      type: str().min(1), // not a literal, won't be in optionMap
      value: num().refine(async (v) => v > 0, "Positive"),
    });
    const schema = du("type", [asyncOption as any]);

    // This triggers: option._parse returns Promise → then(r) → isOk(r) is TRUE → line 214
    const r = await schema.parseAsync({ type: "active", value: 5 });
    expect((r as any).type).toBe("active");
    expect((r as any).value).toBe(5);
  });
});

// ─── composite.ts line 269: intersection both sides fail simultaneously ───────
// Branch: `!isOk(l) && !isOk(r)` — both left AND right fail
describe("intersection both sides fail (line 269)", () => {
  it("both left and right schemas fail — combined errors returned", () => {
    // Left requires string, right requires number — same input can't satisfy both
    const schema = intr(
      str().min(100),  // will fail: too short
      num()            // will fail: not a number
    );
    const r = schema.safeParse("short");
    expect(r.success).toBe(false);
    // Both fail: left fails (too short), right fails (not a number)
    if (!r.success) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("async both sides fail simultaneously", async () => {
    const left = str().refine(async (v) => v.length > 100, "Left fail");
    const right = num(); // fails immediately (not a number)
    const schema = intr(left, right);
    const r = await schema.safeParseAsync("short");
    expect(r.success).toBe(false);
  });
});

// ─── object.ts: strip() method (uncovered function) ─────────────────────────
describe("object.strip() explicit call", () => {
  it("strip() restores strip mode after strict", () => {
    const schema = obj({ name: str() }).strict().strip();
    // After strip(), unknown keys should be silently dropped (not error)
    const r = schema.parse({ name: "Alice", extra: "ignored" });
    expect(r.name).toBe("Alice");
    expect((r as any).extra).toBeUndefined();
  });

  it("strip() on fresh schema works as default behavior", () => {
    const schema = obj({ name: str() }).strip();
    const r = schema.parse({ name: "Alice", extra: "x" });
    expect((r as any).extra).toBeUndefined();
  });
});

// ─── schema.ts: TransformSchema fatal() in rctx (uncovered function) ─────────
describe("TransformSchema rctx fatal() function (uncovered)", () => {
  it("fatal() in transform ctx is a no-op but callable", () => {
    const schema = str().transform((v, ctx) => {
      // Call fatal — it's a no-op in TransformSchema ctx but must be covered
      ctx.fatal();
      ctx.addIssue({ code: "custom", message: "Transform error" });
      return v;
    });
    const r = schema.safeParse("test");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors[0]!.message).toBe("Transform error");
  });
});

// ─── schema.ts: _applyRefinements when no refinements ────────────────────────
describe("_applyRefinements short-circuit when 0 refinements", () => {
  it("schema with no refinements returns result immediately", () => {
    // Base schema with no refinements passes through
    const schema = str();
    expect(schema.parse("hello")).toBe("hello");
    // No refinements = early return from _applyRefinements
    const r = schema.safeParse("hi");
    expect(r.success).toBe(true);
  });

  it("failed parse with no refinements returns fail immediately", () => {
    const schema = str();
    const r = schema.safeParse(42);
    expect(r.success).toBe(false);
    // _applyRefinements called with isOk=false, returns immediately
  });
});

// ─── Composite branch: intersection both fail ASYNC ──────────────────────────
describe("intersection async where both fail (line 269 async path)", () => {
  it("both async sides fail — async Promise.all merge returns combined errors", async () => {
    const left = str().refine(async (v) => v.length > 50, "Left too short");
    const right = str().refine(async (v) => v.startsWith("MUST"), "Right wrong prefix");
    const schema = intr(left, right);
    // Both will fail async — triggers Promise.all path then merge with both failing
    const r = await schema.safeParseAsync("short");
    expect(r.success).toBe(false);
    if (!r.success) {
      // Should have errors from both sides merged
      expect(r.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});
