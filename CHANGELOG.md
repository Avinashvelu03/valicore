# Changelog

All notable changes to this project will be documented in this file.
Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-04-03

### Added
- Full schema validation suite (30+ types)
  - Primitives: string, number, boolean, date, bigint, symbol, null, undefined, void, any, unknown, never, nan
  - Composite: object, array, tuple, union, discriminatedUnion, intersection
  - Collections: record, map, set
  - Special: literal, enum, nativeEnum, promise, lazy, custom, preprocess, brand
  - Coercion: v.coerce.string/number/boolean/date/bigint
- TypeScript-first type inference engine (`Infer<T>`)
- Async validation support (parseAsync, safeParseAsync, async refinements)
- Recursive schemas via v.lazy()
- Discriminated unions with O(1) lookup
- Transform & pipeline composition
- Custom error messages on every validator
- Nested error path tracking ("user.address.street")
- JSON Schema output (toJSONSchema)
- OpenAPI 3.x output (toOpenAPI)
- ValiError with flatten() and format() helpers
- 100% test coverage (lines, branches, functions, statements)
- Zero runtime dependencies
- Dual ESM + CJS build with TypeScript declarations
