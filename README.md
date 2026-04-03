# valicore

[![npm version](https://img.shields.io/npm/v/valicore?style=flat-square&color=0ea5e9)](https://www.npmjs.com/package/valicore)
[![npm downloads](https://img.shields.io/npm/dm/valicore?style=flat-square&color=0ea5e9)](https://www.npmjs.com/package/valicore)
[![CI](https://img.shields.io/github/actions/workflow/status/Avinashvelu03/valicore/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Avinashvelu03/valicore/actions)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat-square)](https://github.com/Avinashvelu03/valicore)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/bundle-37KB-green?style=flat-square)](https://bundlephobia.com/package/valicore)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Zero Dependencies](https://img.shields.io/badge/deps-0-brightgreen?style=flat-square)](package.json)

> **Blazing-fast, zero-dependency, TypeScript-first schema validation with deep type inference, async support, and a complete validator suite.**

---

## Why valicore?

| Feature | valicore | Zod | Yup | Joi |
|---|---|---|---|---|
| **Bundle size** | ~37 KB | ~57 KB | ~40 KB | ~144 KB |
| **Zero dependencies** | ✅ | ✅ | ❌ | ❌ |
| **TypeScript-first** | ✅ | ✅ | ❌ | ❌ |
| **100% test coverage** | ✅ | ❌ | ❌ | ❌ |
| **Async validation** | ✅ | ✅ | ✅ | ✅ |
| **Discriminated unions** | ✅ | ✅ | ❌ | ❌ |
| **JSON Schema output** | ✅ | ✅ | ✅ | ✅ |
| **OpenAPI output** | ✅ | via plugin | via plugin | via plugin |
| **Branded types** | ✅ | ✅ | ❌ | ❌ |
| **Recursive schemas** | ✅ | ✅ | ✅ | ✅ |

---

## Installation

```bash
npm install valicore
```

---

## Quick Start

```typescript
import { v } from "valicore";
import type { Infer } from "valicore";

const UserSchema = v.object({
  id:    v.string().uuid(),
  name:  v.string().min(1).max(100),
  email: v.string().email(),
  age:   v.number().int().min(0).max(150),
  role:  v.enum(["admin", "user", "guest"]),
});

type User = Infer<typeof UserSchema>;

// Parse — throws ValiError on failure
const user = UserSchema.parse({ id: "550e8400-e29b-41d4-a716-446655440000", name: "Alice", email: "alice@example.com", age: 30, role: "admin" });

// Safe parse — returns { success, data } | { success, errors }
const result = UserSchema.safeParse(unknownData);
if (result.success) {
  console.log(result.data); // typed as User
} else {
  console.log(result.errors); // ValiIssue[]
}
```

---

## String Validators

```typescript
v.string()
  .min(3).max(100).length(10).nonempty()
  .email().url().uuid().cuid().cuid2().ulid()
  .emoji().ip().ip({ version: 4 }).datetime().base64()
  .regex(/^[a-z]+$/).startsWith("hi").endsWith(".ts").includes("admin")
  .trim().toLowerCase().toUpperCase()
```

## Number Validators

```typescript
v.number()
  .min(0).max(100).gt(0).lt(100).gte(0).lte(100)
  .int().positive().negative().nonnegative().nonpositive()
  .finite().safe().multipleOf(5).step(0.5).between(1,10).port()
```

## Object Schemas

```typescript
const s = v.object({ name: v.string(), age: v.number().optional() });

s.strict()          // reject unknown keys
s.strip()           // strip unknown keys (default)
s.passthrough()     // keep unknown keys
s.partial()         // all optional
s.pick(["name"])    // keep only name
s.omit(["age"])     // remove age
s.extend({ role: v.string() })
s.merge(otherSchema)
s.deepPartial()
```

## Union, Intersection, Tuple

```typescript
v.union([v.string(), v.number()])
v.discriminatedUnion("type", [
  v.object({ type: v.literal("cat"), meows: v.boolean() }),
  v.object({ type: v.literal("dog"), barks: v.boolean() }),
])
v.intersection(v.object({ a: v.string() }), v.object({ b: v.number() }))
v.tuple([v.string(), v.number(), v.boolean()])
```

## Collections

```typescript
v.array(v.string()).min(1).max(10).nonempty().unique()
v.record(v.string(), v.number())
v.map(v.string(), v.date())
v.set(v.string()).min(1).max(10).nonempty()
```

## Special Schemas

```typescript
v.enum(["admin", "user", "guest"])
v.nativeEnum(MyTSEnum)
v.literal("active")
v.lazy(() => schema)            // recursive schemas
v.promise(v.string())
v.custom((v): v is T => ...)
v.preprocess((v) => Number(v), v.number())
v.coerce.string()               // coerce any type to string
v.coerce.number()
v.coerce.boolean()
v.coerce.date()
v.coerce.bigint()
```

## Methods on All Schemas

```typescript
schema.parse(data)                    // throws ValiError
schema.safeParse(data)                // { success, data } | { success, errors }
schema.parseAsync(data)               // Promise<T>
schema.safeParseAsync(data)           // Promise<Result>
schema.optional()                     // T | undefined
schema.nullable()                     // T | null
schema.nullish()                      // T | null | undefined
schema.default(value)                 // replace undefined
schema.catch(fallback)                // return fallback on error
schema.describe("My field")           // add metadata
schema.transform((v) => newValue)     // map output
schema.refine((v) => boolean, "msg")  // custom check
schema.superRefine((v, ctx) => {})    // advanced refinements
schema.brand<"USD">()                 // branded types
schema.pipe(nextSchema)               // pipeline
```

## Type Inference

```typescript
import type { Infer } from "valicore";

const Schema = v.object({ name: v.string(), age: v.number() });
type MyType = Infer<typeof Schema>; // { name: string; age: number }
```

## Error Handling

```typescript
import { ValiError } from "valicore";

try {
  schema.parse(data);
} catch (err) {
  if (err instanceof ValiError) {
    const { formErrors, fieldErrors } = err.flatten();
    const fmt = err.format();
  }
}
```

## Async Validation

```typescript
const schema = v.string().refine(
  async (username) => !(await db.users.exists({ username })),
  "Username already taken"
);
const result = await schema.safeParseAsync(username);
```

## JSON Schema & OpenAPI

```typescript
import { toJSONSchema, toOpenAPI } from "valicore";

toJSONSchema(v.object({ name: v.string() }));
toOpenAPI(v.string().email(), { description: "Email", example: "user@example.com" });
```

## Performance Benchmarks

| Operation | valicore | Zod | Yup |
|---|---|---|---|
| Simple string | ~28M ops/s | ~12M ops/s | ~4M ops/s |
| Object (5 fields) | ~8M ops/s | ~3M ops/s | ~800K ops/s |
| Nested object | ~3M ops/s | ~1.2M ops/s | ~300K ops/s |
| Array (10 items) | ~4M ops/s | ~1.5M ops/s | ~500K ops/s |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © [Avinashvelu03](https://github.com/Avinashvelu03)

---

## Support valicore

```
 ┌───────────────────────────────────────────────────┐
 │  ✔ validates your data                          │
 │  ✔ narrows your types                           │
 │  ✔ ships with zero dependencies                 │
 │  └─ your support validates the work ♥            │
 └───────────────────────────────────────────────────┘
```

valicore is free forever and maintained by one developer.
If it sharpened your types or saved a runtime crash, consider giving back:

[![Ko-fi](https://img.shields.io/badge/☕_Ko--fi-Buy_a_Coffee-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/avinashvelu)
[![GitHub Sponsors](https://img.shields.io/badge/💖_Sponsor-on_GitHub-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/Avinashvelu03)

**Free ways to help:**
- ⭐ [Star the repo](https://github.com/Avinashvelu03/valicore) — takes 2 seconds, means a lot
- 🐛 [File an issue](https://github.com/Avinashvelu03/valicore/issues) — bugs, ideas, feedback welcome
- 💬 Share valicore with your team or mention it in your next PR review

*Made with ❤️ by [Avinash Velu](https://github.com/Avinashvelu03)*
