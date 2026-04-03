# Contributing to valicore

Thank you for your interest in contributing!

## Setup

```bash
git clone https://github.com/Avinashvelu03/valicore.git
cd valicore
npm install
npm test          # run tests
npm run build     # build ESM + CJS + types
npm run lint      # lint
npm run typecheck # TypeScript check
```

## Adding a New Schema Type

1. Create `src/schemas/mytype.ts` extending `Schema<T>`
2. Implement `_parseValue(input, ctx): ParseResult<T>`
3. Export from `src/index.ts`
4. Add to the `v` namespace in `src/index.ts`
5. Write exhaustive tests in `tests/schemas/mytype.test.ts`
6. Ensure 100% coverage

## Commit Format (Conventional Commits)

```
feat: add v.phone() schema
fix: correct email regex for edge case
test: add async union tests
docs: update README with new examples
chore: bump deps
```

## Pull Request Process

1. Fork and create a branch: `git checkout -b feat/my-feature`
2. Implement with tests (100% coverage required)
3. Run `npm run audit` (lint + typecheck + coverage + build)
4. Open a PR against `main`
5. Fill in the PR template

## Code Style

- TypeScript strict mode
- No `any` except where architecturally necessary (documented)
- Prettier formatting (`npm run format`)
- ESLint clean (`npm run lint`)

## Reporting Issues

Use the GitHub issue templates for bug reports and feature requests.
