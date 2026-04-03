// Core
export { ValiError, getTypeName } from "./core/errors.js";
export type { ValiIssue, IssueCode } from "./core/errors.js";
export { ok, fail, isOk, isFail } from "./core/result.js";
export type { ParseResult, ParseSuccess, ParseFailure } from "./core/result.js";
export {
  Schema, OptionalSchema, NullableSchema, NullishSchema,
  DefaultSchema, CatchSchema, TransformSchema, BrandedSchema, PipelineSchema,
} from "./core/schema.js";
export type { ParseCtx, RefinementCtx, Refinement } from "./core/schema.js";
export type { Infer, InferInput, DeepPartial, Branded, Prettify, AnySchema } from "./core/types.js";

// Schemas
export { StringSchema, string } from "./schemas/string.js";
export { NumberSchema, number } from "./schemas/number.js";
export { BooleanSchema, boolean } from "./schemas/boolean.js";
export { DateSchema, date } from "./schemas/date.js";
export { BigIntSchema, bigint } from "./schemas/bigint.js";
export {
  SymbolSchema, symbol,
  UndefinedSchema, undefinedSchema,
  NullSchema, nullSchema,
  VoidSchema, voidSchema,
  AnySchema as AnyTypeSchema, any,
  UnknownSchema, unknown,
  NeverSchema, neverSchema,
  NaNSchema, nan,
} from "./schemas/primitives.js";
export { LiteralSchema, literal } from "./schemas/literal.js";
export type { LiteralValue } from "./schemas/literal.js";
export { ObjectSchema, object } from "./schemas/object.js";
export type { SchemaShape, InferShape } from "./schemas/object.js";
export { ArraySchema, array } from "./schemas/array.js";
export {
  TupleSchema, tuple,
  UnionSchema, union,
  DiscriminatedUnionSchema, discriminatedUnion,
  IntersectionSchema, intersection,
} from "./schemas/composite.js";
export { RecordSchema, record, MapSchema, map, SetSchema, set } from "./schemas/collections.js";
export {
  EnumSchema, enumSchema,
  NativeEnumSchema, nativeEnum,
  PromiseSchema, promise,
  LazySchema, lazy,
  CustomSchema, custom,
  PreprocessSchema, preprocess,
} from "./schemas/special.js";
export { coerce } from "./schemas/coerce.js";

// Plugins
export { toJSONSchema } from "./plugins/jsonSchema.js";
export type { JSONSchemaType } from "./plugins/jsonSchema.js";
export { toOpenAPI } from "./plugins/openapi.js";
export type { OpenAPISchemaObject, OpenAPIOptions } from "./plugins/openapi.js";

// Utils
export {
  deepMerge, deepClone, isPlainObject, isPrimitive,
  hasOwn, isPromise, formatPath, formatValue,
} from "./utils/index.js";

// Namespace API
import { string } from "./schemas/string.js";
import { number } from "./schemas/number.js";
import { boolean } from "./schemas/boolean.js";
import { date } from "./schemas/date.js";
import { bigint } from "./schemas/bigint.js";
import { symbol, undefinedSchema, nullSchema, voidSchema, any, unknown, neverSchema, nan } from "./schemas/primitives.js";
import { literal } from "./schemas/literal.js";
import { object } from "./schemas/object.js";
import { array } from "./schemas/array.js";
import { tuple, union, discriminatedUnion, intersection } from "./schemas/composite.js";
import { record, map, set } from "./schemas/collections.js";
import { enumSchema, nativeEnum, promise, lazy, custom, preprocess } from "./schemas/special.js";
import { coerce } from "./schemas/coerce.js";

/* c8 ignore next */
export const v = {
  string, number, boolean, date, bigint,
  symbol, undefined: undefinedSchema, null: nullSchema, void: voidSchema,
  any, unknown, never: neverSchema, nan,
  literal, object, array, tuple, union, discriminatedUnion, intersection,
  record, map, set,
  enum: enumSchema, nativeEnum, promise, lazy, custom, preprocess, coerce,
};

export default v;
