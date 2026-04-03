// ─── merge.ts ────────────────────────────────────────────────────────────────

export function deepMerge<T extends object, U extends object>(
  target: T,
  source: U
): T & U {
  const result = { ...target } as T & U;
  for (const key of Object.keys(source) as (keyof U)[]) {
    const srcVal = source[key];
    const tgtVal = (target as Record<string, unknown>)[key as string];
    if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      (result as Record<string, unknown>)[key as string] = deepMerge(
        tgtVal as object,
        srcVal as object
      );
    } else {
      (result as Record<string, unknown>)[key as string] = srcVal;
    }
  }
  return result;
}

// ─── clone.ts ────────────────────────────────────────────────────────────────

export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (value instanceof Map) {
    return new Map(
      [...value.entries()].map(([k, v]) => [deepClone(k), deepClone(v)])
    ) as unknown as T;
  }
  if (value instanceof Set) {
    return new Set([...value].map((v) => deepClone(v))) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  const cloned = Object.create(Object.getPrototypeOf(value)) as T;
  for (const key of Object.keys(value as object)) {
    (cloned as Record<string, unknown>)[key] = deepClone(
      (value as Record<string, unknown>)[key]
    );
  }
  return cloned;
}

// ─── typeCheck.ts ─────────────────────────────────────────────────────────────

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

export function isPrimitive(
  value: unknown
): value is string | number | boolean | null | undefined | bigint | symbol {
  return value === null || typeof value !== "object" && typeof value !== "function";
}

export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isPromise(value: unknown): value is Promise<unknown> {
  return (
    value instanceof Promise ||
    (typeof value === "object" &&
      value !== null &&
      typeof (value as { then?: unknown }).then === "function")
  );
}

// ─── formatting.ts ────────────────────────────────────────────────────────────

export function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return "(root)";
  return path
    .map((segment, i) => {
      if (typeof segment === "number") return `[${segment}]`;
      if (i === 0) return segment;
      return `.${segment}`;
    })
    .join("");
}

export function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  if (typeof value === "object") return "[object]";
  return String(value);
}
