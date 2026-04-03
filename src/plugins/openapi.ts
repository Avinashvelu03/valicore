import { toJSONSchema, type JSONSchemaType } from "./jsonSchema.js";
import type { AnySchema } from "../core/types.js";

export type OpenAPISchemaObject = JSONSchemaType & {
  nullable?: boolean;
  example?: unknown;
  examples?: Record<string, unknown>;
};

export type OpenAPIOptions = {
  title?: string;
  description?: string;
  version?: string;
  example?: unknown;
};

export function toOpenAPI(
  schema: AnySchema,
  opts?: OpenAPIOptions
): OpenAPISchemaObject {
  const jsonSchema = toJSONSchema(schema);
  // Remove $schema — not part of OpenAPI
  const { $schema, ...rest } = jsonSchema;
  void $schema;

  const result: OpenAPISchemaObject = { ...rest };

  if (opts?.description) result.description = opts.description;
  if (opts?.example !== undefined) result.example = opts.example;

  return result;
}
