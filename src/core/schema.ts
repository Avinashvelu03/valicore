/* eslint-disable @typescript-eslint/no-explicit-any */
import { ValiError, type ValiIssue } from "./errors.js";
import { ok, fail, isOk, type ParseResult, type ParseSuccess, type ParseFailure } from "./result.js";

export type RefinementCtx = {
  addIssue(issue: Omit<ValiIssue, "path"> & { path?: (string | number)[] }): void;
  path: (string | number)[];
  fatal(): void;
};

export type Refinement<T> = {
  check: (value: T, ctx: RefinementCtx) => void | Promise<void>;
  async: boolean;
};

export interface ParseCtx {
  path: (string | number)[];
  async: boolean;
}

export function makeCtx(path: (string | number)[] = [], asyncMode = false): ParseCtx {
  return { path, async: asyncMode };
}

export abstract class Schema<O, I = unknown> {
  declare readonly _output: O;
  declare readonly _input: I;
  _description?: string;
  _refinements: Refinement<any>[] = [];

  abstract _parseValue(input: unknown, ctx: ParseCtx): ParseResult<O> | Promise<ParseResult<O>>;

  _parse(input: unknown, ctx: ParseCtx): ParseResult<O> | Promise<ParseResult<O>> {
    const base = this._parseValue(input, ctx);
    if (base instanceof Promise) return base.then((r) => this._applyRefinements(r, ctx));
    if (this._refinements.some((r) => r.async)) return Promise.resolve(this._applyRefinements(base, ctx));
    return this._applyRefinements(base, ctx) as ParseResult<O>;
  }

  _applyRefinements(result: ParseResult<O>, ctx: ParseCtx): ParseResult<O> | Promise<ParseResult<O>> {
    if (!isOk(result) || this._refinements.length === 0) return result;
    const issues: ValiIssue[] = [];
    let fatal = false;
    const data = result.data;
    const makeRCtx = (): RefinementCtx => ({
      path: [...ctx.path],
      addIssue(issue) {
        issues.push({
          code: issue.code ?? "custom",
          path: issue.path !== undefined ? issue.path : [...ctx.path],
          message: issue.message ?? "Invalid value",
        } as ValiIssue);
      },
      fatal() { fatal = true; },
    });
    if (!this._refinements.some((r) => r.async)) {
      for (const ref of this._refinements) {
        const rctx = makeRCtx();
        ref.check(data, rctx);
        if (fatal) break;
      }
      return issues.length > 0 ? fail(issues) : ok(data);
    }
    const runAsync = async (): Promise<ParseResult<O>> => {
      for (const ref of this._refinements) {
        const rctx = makeRCtx();
        await ref.check(data, rctx);
        if (fatal) break;
      }
      return issues.length > 0 ? fail(issues) : ok(data);
    };
    return runAsync();
  }

  parse(input: unknown): O {
    const result = this._parse(input, makeCtx([]));
    if (result instanceof Promise) throw new Error("Use parseAsync() for async schemas.");
    if (isOk(result)) return result.data;
    throw new ValiError((result as ParseFailure).errors);
  }

  safeParse(input: unknown): { success: true; data: O } | { success: false; errors: ValiIssue[] } {
    const result = this._parse(input, makeCtx([]));
    if (result instanceof Promise) throw new Error("Use safeParseAsync() for async schemas.");
    return result;
  }

  async parseAsync(input: unknown): Promise<O> {
    const result = await Promise.resolve(this._parse(input, makeCtx([], true)));
    if (isOk(result)) return result.data;
    throw new ValiError((result as ParseFailure).errors);
  }

  async safeParseAsync(input: unknown): Promise<{ success: true; data: O } | { success: false; errors: ValiIssue[] }> {
    return Promise.resolve(this._parse(input, makeCtx([], true)));
  }

  optional(): OptionalSchema<this> { return new OptionalSchema(this as any) as any; }
  nullable(): NullableSchema<this> { return new NullableSchema(this as any) as any; }
  nullish(): NullishSchema<this> { return new NullishSchema(this as any) as any; }
  default(v: O | (() => O)): DefaultSchema<this> { return new DefaultSchema(this as any, v) as any; }
  catch(v: O | (() => O)): CatchSchema<this> { return new CatchSchema(this as any, v) as any; }

  describe(description: string): this {
    const clone = this._clone();
    clone._description = description;
    return clone;
  }

  transform<T>(fn: (data: O, ctx: RefinementCtx) => T | Promise<T>): TransformSchema<this, T> {
    return new TransformSchema(this as any, fn) as any;
  }

  refine(
    check: (data: O) => boolean | Promise<boolean>,
    message: string | { message: string } | ((val: O) => string) = "Invalid value"
  ): this {
    const clone = this._clone();
    const getMsg = (data: O): string =>
      typeof message === "function" ? (message as (v: O) => string)(data)
      : typeof message === "string" ? message
      : message.message;
    const isAsyncCheck = check.constructor.name === "AsyncFunction";
    clone._refinements = [...clone._refinements, {
      async: isAsyncCheck,
      check: (data: O, ctx: RefinementCtx) => {
        const r = check(data);
        if (r instanceof Promise) return r.then((v) => { if (!v) ctx.addIssue({ code: "custom", message: getMsg(data) }); });
        if (!r) ctx.addIssue({ code: "custom", message: getMsg(data) });
        return undefined;
      },
    }];
    return clone;
  }

  superRefine(fn: (data: O, ctx: RefinementCtx) => void | Promise<void>): this {
    const clone = this._clone();
    const isAsync = fn.constructor.name === "AsyncFunction";
    clone._refinements = [...clone._refinements, { async: isAsync, check: fn }];
    return clone;
  }

  brand<B extends string | symbol>(): BrandedSchema<this, B> {
    return new BrandedSchema<any, B>(this as any) as any;
  }

  pipe<T>(schema: Schema<T, any>): PipelineSchema<this, Schema<T, any>> {
    return new PipelineSchema(this as any, schema) as any;
  }

  _clone(): this {
    const clone = Object.create(Object.getPrototypeOf(this)) as this;
    Object.assign(clone, this);
    clone._refinements = [...this._refinements];
    return clone;
  }

  get description(): string | undefined { return this._description; }
}

export class OptionalSchema<T extends Schema<any, any>> extends Schema<T["_output"] | undefined> {
  readonly _inner: T;
  constructor(inner: T) { super(); this._inner = inner; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T["_output"] | undefined> | Promise<ParseResult<T["_output"] | undefined>> {
    if (input === undefined) return ok(undefined);
    return this._inner._parse(input, ctx) as ParseResult<T["_output"] | undefined>;
  }
  unwrap(): T { return this._inner; }
}

export class NullableSchema<T extends Schema<any, any>> extends Schema<T["_output"] | null> {
  readonly _inner: T;
  constructor(inner: T) { super(); this._inner = inner; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T["_output"] | null> | Promise<ParseResult<T["_output"] | null>> {
    if (input === null) return ok(null);
    return this._inner._parse(input, ctx) as ParseResult<T["_output"] | null>;
  }
  unwrap(): T { return this._inner; }
}

export class NullishSchema<T extends Schema<any, any>> extends Schema<T["_output"] | null | undefined> {
  readonly _inner: T;
  constructor(inner: T) { super(); this._inner = inner; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T["_output"] | null | undefined> | Promise<ParseResult<T["_output"] | null | undefined>> {
    if (input === null || input === undefined) return ok(input as null | undefined);
    return this._inner._parse(input, ctx) as ParseResult<T["_output"] | null | undefined>;
  }
  unwrap(): T { return this._inner; }
}

export class DefaultSchema<T extends Schema<any, any>> extends Schema<Exclude<T["_output"], undefined>> {
  readonly _inner: T;
  readonly _default: T["_output"] | (() => T["_output"]);
  constructor(inner: T, d: T["_output"] | (() => T["_output"])) { super(); this._inner = inner; this._default = d; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<Exclude<T["_output"], undefined>> | Promise<ParseResult<Exclude<T["_output"], undefined>>> {
    const val = input === undefined ? (typeof this._default === "function" ? (this._default as () => T["_output"])() : this._default) : input;
    return this._inner._parse(val, ctx) as ParseResult<Exclude<T["_output"], undefined>>;
  }
  removeDefault(): T { return this._inner; }
}

export class CatchSchema<T extends Schema<any, any>> extends Schema<T["_output"]> {
  readonly _inner: T;
  readonly _fallback: T["_output"] | (() => T["_output"]);
  constructor(inner: T, f: T["_output"] | (() => T["_output"])) { super(); this._inner = inner; this._fallback = f; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T["_output"]> | Promise<ParseResult<T["_output"]>> {
    const fb = () => typeof this._fallback === "function" ? (this._fallback as () => T["_output"])() : this._fallback;
    const res = this._inner._parse(input, ctx);
    if (res instanceof Promise) return res.then((r) => (isOk(r) ? r : ok(fb())));
    return isOk(res) ? res : ok(fb());
  }
}

export class TransformSchema<T extends Schema<any, any>, O> extends Schema<O, T["_input"]> {
  readonly _inner: T;
  readonly _transform: (data: T["_output"], ctx: RefinementCtx) => O | Promise<O>;
  constructor(inner: T, fn: (data: T["_output"], ctx: RefinementCtx) => O | Promise<O>) { super(); this._inner = inner; this._transform = fn; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<O> | Promise<ParseResult<O>> {
    const res = this._inner._parse(input, ctx);
    const apply = (r: ParseResult<T["_output"]>): ParseResult<O> | Promise<ParseResult<O>> => {
      if (!isOk(r)) return r as ParseFailure;
      const issues: ValiIssue[] = [];
      const rctx: RefinementCtx = {
        path: [...ctx.path],
        addIssue(iss) { const i: ValiIssue = { code: "custom", path: [...ctx.path], message: "Invalid value" }; Object.assign(i, iss); issues.push(i); },
        fatal() {},
      };
      const t = this._transform(r.data, rctx);
      if (t instanceof Promise) return t.then((v) => issues.length > 0 ? fail(issues) : ok(v));
      return issues.length > 0 ? fail(issues) : ok(t);
    };
    if (res instanceof Promise) return res.then((r) => apply(r));
    return apply(res);
  }
}

export class BrandedSchema<T extends Schema<any, any>, B extends string | symbol> extends Schema<T["_output"] & { readonly __brand: B }> {
  readonly _inner: T;
  constructor(inner: T) { super(); this._inner = inner; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<T["_output"] & { readonly __brand: B }> | Promise<ParseResult<T["_output"] & { readonly __brand: B }>> {
    return this._inner._parse(input, ctx) as ParseResult<T["_output"] & { readonly __brand: B }>;
  }
  unwrap(): T { return this._inner; }
}

export class PipelineSchema<A extends Schema<any, any>, B extends Schema<any, any>> extends Schema<B["_output"], A["_input"]> {
  readonly _in: A;
  readonly _out: B;
  constructor(a: A, b: B) { super(); this._in = a; this._out = b; }
  _parseValue(input: unknown, ctx: ParseCtx): ParseResult<B["_output"]> | Promise<ParseResult<B["_output"]>> {
    const resA = this._in._parse(input, ctx);
    const applyB = (r: ParseResult<any>): ParseResult<B["_output"]> | Promise<ParseResult<B["_output"]>> => {
      if (!isOk(r)) return r as ParseFailure;
      return this._out._parse(r.data, ctx) as ParseResult<B["_output"]>;
    };
    if (resA instanceof Promise) return resA.then(applyB);
    return applyB(resA);
  }
}

export { ok, fail, isOk, type ParseResult, type ParseSuccess, type ParseFailure };
