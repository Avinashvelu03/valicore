/* eslint-disable @typescript-eslint/no-explicit-any */
import { StringSchema } from "../schemas/string.js";
import { NumberSchema } from "../schemas/number.js";
import { BooleanSchema } from "../schemas/boolean.js";
import { DateSchema } from "../schemas/date.js";
import { BigIntSchema } from "../schemas/bigint.js";
import { ObjectSchema } from "../schemas/object.js";
import { ArraySchema } from "../schemas/array.js";
import { TupleSchema, UnionSchema } from "../schemas/composite.js";
import { EnumSchema, NativeEnumSchema } from "../schemas/special.js";
import { LiteralSchema } from "../schemas/literal.js";
import { OptionalSchema, NullableSchema, NullishSchema } from "../core/schema.js";
import { AnySchema, UnknownSchema, NeverSchema } from "../schemas/primitives.js";

export type JSONSchemaType = {
  type?: string | string[];
  properties?: Record<string, JSONSchemaType>;
  required?: string[];
  items?: JSONSchemaType;
  prefixItems?: JSONSchemaType[];
  oneOf?: JSONSchemaType[];
  anyOf?: JSONSchemaType[];
  allOf?: JSONSchemaType[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean | JSONSchemaType;
  description?: string;
  $schema?: string;
  nullable?: boolean;
  not?: JSONSchemaType;
};

export function toJSONSchema(schema: any): JSONSchemaType {
  const result = convertSchema(schema);
  return { $schema: "http://json-schema.org/draft-07/schema#", ...result };
}

function convertSchema(schema: any): JSONSchemaType {
  const base: JSONSchemaType = {};
  if (schema?.description) base.description = schema.description as string;

  if (schema instanceof OptionalSchema) return convertSchema(schema._inner);
  if (schema instanceof NullableSchema) return { anyOf: [convertSchema(schema._inner), { type: "null" }] };
  if (schema instanceof NullishSchema) return { anyOf: [convertSchema(schema._inner), { type: "null" }] };
  if (schema instanceof StringSchema) return { ...base, type: "string" };
  if (schema instanceof NumberSchema) return { ...base, type: "number" };
  if (schema instanceof BooleanSchema) return { ...base, type: "boolean" };
  if (schema instanceof DateSchema) return { ...base, type: "string", format: "date-time" };
  if (schema instanceof BigIntSchema) return { ...base, type: "integer", format: "int64" };

  if (schema instanceof ObjectSchema) {
    const properties: Record<string, JSONSchemaType> = {};
    const required: string[] = [];
    for (const [key, fieldSchema] of Object.entries(schema.shape)) {
      properties[key] = convertSchema(fieldSchema);
      if (!(fieldSchema instanceof OptionalSchema) && !(fieldSchema instanceof NullishSchema)) {
        required.push(key);
      }
    }
    return { ...base, type: "object", properties, ...(required.length > 0 ? { required } : {}) };
  }

  if (schema instanceof ArraySchema) return { ...base, type: "array", items: convertSchema(schema.element) };

  if (schema instanceof TupleSchema) {
    return { ...base, type: "array", prefixItems: (schema.items as any[]).map((s: any) => convertSchema(s)) };
  }

  if (schema instanceof UnionSchema) {
    return { ...base, anyOf: (schema.options as any[]).map((s: any) => convertSchema(s)) };
  }

  if (schema instanceof EnumSchema) return { ...base, enum: schema.enum };
  if (schema instanceof NativeEnumSchema) return { ...base, enum: Object.values(schema.nativeEnum as object) };
  if (schema instanceof LiteralSchema) return { ...base, const: schema.value };
  if (schema instanceof AnySchema || schema instanceof UnknownSchema) return base;
  if (schema instanceof NeverSchema) return { ...base, not: {} };

  return base;
}
