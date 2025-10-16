# CONTRIBUTING.md

> ⚠️ **DEPRECATED:** This file is outdated and superseded by `level-ops/CONTRIBUTING.md`.
> This version remains for historical context and will be removed after Sprint 3.
> **Please refer to `level-ops/CONTRIBUTING.md` for current contribution guidelines.**

## Workflow
- Small, atomic PRs. Each PR maps to one task or a tight set of related changes.
- Always run: `npm run typechecks && npm run lint && npm test && npm run build` before pushing.

## Branches
- `main` — protected.  
- Feature branches: `feat/<scope>`, fixes: `fix/<scope>`, chores: `chore/<scope>`.

## Commits
- Conventional messages: `feat: …`, `fix: …`, `chore: …`, `docs: …`, `refactor: …`, `test: …`.
- Keep messages imperative and specific.

## Reviews
- PR must be green on CI (typecheck, lint, tests, build).
- No commented-out code; no placeholders.
- If PR affects security (RLS, auth, file access), include a brief risk note.

## Tests
- Add unit/integration tests for all non-trivial logic.
- Don’t weaken tests to make them pass.
