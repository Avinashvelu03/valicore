import { describe, it, expect } from "vitest";
import { ValiError, getTypeName } from "../../src/core/errors.js";
import { ok, fail, isOk, isFail } from "../../src/core/result.js";

describe("ValiError", () => {
  it("creates error with issues", () => {
    const err = new ValiError([{ code: "invalid_type", path: [], message: "Bad" }]);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValiError);
    expect(err.name).toBe("ValiError");
    expect(err.issues).toHaveLength(1);
  });

  it("formats single issue message", () => {
    const err = new ValiError([{ code: "invalid_type", path: ["name"], message: "Expected string" }]);
    expect(err.message).toContain("Expected string");
    expect(err.message).toContain("name");
  });

  it("formats multiple issues with bullet list", () => {
    const err = new ValiError([
      { code: "invalid_type", path: ["a"], message: "Bad A" },
      { code: "too_small", path: ["b"], message: "Bad B" },
    ]);
    expect(err.message).toContain("2 validation errors");
    expect(err.message).toContain("Bad A");
    expect(err.message).toContain("Bad B");
  });

  it("format() produces nested error map", () => {
    const err = new ValiError([
      { code: "custom", path: [], message: "Root error" },
      { code: "invalid_type", path: ["name"], message: "Name error" },
    ]);
    const fmt = err.format();
    expect((fmt["_errors"] as string[])).toContain("Root error");
    expect(fmt["name"]).toBeDefined();
  });

  it("flatten() separates form and field errors", () => {
    const err = new ValiError([
      { code: "custom", path: [], message: "Form error" },
      { code: "invalid_type", path: ["email"], message: "Field error" },
    ]);
    const { formErrors, fieldErrors } = err.flatten();
    expect(formErrors).toContain("Form error");
    expect(fieldErrors["email"]).toContain("Field error");
  });

  it("ValiError.create() builds issue", () => {
    const issue = ValiError.create("custom", "Test", ["a", "b"]);
    expect(issue.code).toBe("custom");
    expect(issue.message).toBe("Test");
    expect(issue.path).toEqual(["a", "b"]);
  });

  it("has correct prototype chain", () => {
    const err = new ValiError([{ code: "custom", path: [], message: "x" }]);
    expect(Object.getPrototypeOf(err)).toBe(ValiError.prototype);
  });
});

describe("getTypeName", () => {
  it("returns 'null' for null", () => expect(getTypeName(null)).toBe("null"));
  it("returns 'undefined' for undefined", () => expect(getTypeName(undefined)).toBe("undefined"));
  it("returns 'nan' for NaN", () => expect(getTypeName(NaN)).toBe("nan"));
  it("returns 'array' for arrays", () => expect(getTypeName([])).toBe("array"));
  it("returns 'date' for Date", () => expect(getTypeName(new Date())).toBe("date"));
  it("returns 'map' for Map", () => expect(getTypeName(new Map())).toBe("map"));
  it("returns 'set' for Set", () => expect(getTypeName(new Set())).toBe("set"));
  it("returns 'promise' for Promise", () => expect(getTypeName(Promise.resolve())).toBe("promise"));
  it("returns 'bigint' for bigint", () => expect(getTypeName(1n)).toBe("bigint"));
  it("returns 'string' for string", () => expect(getTypeName("hi")).toBe("string"));
  it("returns 'number' for number", () => expect(getTypeName(42)).toBe("number"));
  it("returns 'boolean' for boolean", () => expect(getTypeName(true)).toBe("boolean"));
  it("returns 'object' for plain objects", () => expect(getTypeName({})).toBe("object"));
  it("returns 'symbol' for symbol", () => expect(getTypeName(Symbol())).toBe("symbol"));
});

describe("ParseResult helpers", () => {
  it("ok() creates success result", () => {
    const r = ok(42);
    expect(r.success).toBe(true);
    expect(r.data).toBe(42);
  });

  it("fail() creates failure result", () => {
    const r = fail([{ code: "custom", path: [], message: "err" }]);
    expect(r.success).toBe(false);
    expect(r.errors).toHaveLength(1);
  });

  it("isOk() returns true for success", () => {
    expect(isOk(ok("hi"))).toBe(true);
    expect(isOk(fail([{ code: "custom", path: [], message: "e" }]))).toBe(false);
  });

  it("isFail() returns true for failure", () => {
    expect(isFail(fail([{ code: "custom", path: [], message: "e" }]))).toBe(true);
    expect(isFail(ok("hi"))).toBe(false);
  });
});
