import type { Schema } from "./schema.js";

// Extract the output type of a schema
export type Infer<T extends Schema<unknown>> = T["_output"];

// Extract the input type of a schema
export type InferInput<T extends Schema<unknown, unknown>> = T["_input"];

// Make all properties in T optional at all depths
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// Make specific keys required
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

// Flatten a type for display
export type Flatten<T> = { [K in keyof T]: T[K] };

// Add a brand to a type
export type Branded<T, B extends string | symbol> = T & { readonly __brand: B };

// Prettify nested type for IDE display
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & unknown;

// Schema shape type
export type SchemaShape = Record<string, Schema<unknown>>;

// Infer object type from shape
export type InferShape<T extends SchemaShape> = Prettify<{
  [K in keyof T]: Infer<T[K]>;
}>;

// Recursive schema reference
export type RecursiveSchema<T> = Schema<T>;

// Any schema type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySchema = Schema<any, any>;

// Union of literal types
export type Literal = string | number | boolean | null | undefined | bigint;

// Check if type is a tuple
export type IsTuple<T extends readonly unknown[]> = number extends T["length"]
  ? false
  : true;

// Get all keys that are optional
export type OptionalKeys<T extends object> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

// Get all keys that are required
export type RequiredObjectKeys<T extends object> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

// Merge two types
export type Merge<A, B> = Omit<A, keyof B> & B;

// Writable version of readonly type
export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Deep writable
export type DeepWritable<T> = {
  -readonly [P in keyof T]: DeepWritable<T[P]>;
};

export type { Schema };
