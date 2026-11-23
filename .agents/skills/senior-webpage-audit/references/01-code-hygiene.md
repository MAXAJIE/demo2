# Pillar 1: Principal Code Hygiene & Refactoring Manual

Apply these standards to keep the codebase lean, predictable, strictly typed, and free of AI-generated bloat.

## 1. Zero Dead Code Policy

Scrub every modified file and its direct dependencies for unused artifacts:

- **Imports & Exports**: Remove unused named/default imports, unused type imports, and dead internal exports not referenced anywhere in the repository.
- **Variables, State & Parameters**: Delete unused local variables, stale `useState` hooks whose setters or values are dead, and unused function arguments (prefix intentional interface-required parameters with `_` only when enforced by a callback signature).
- **Styles & Markup**: Remove unreferenced CSS classes, dead `@keyframes`, redundant Tailwind utility overrides (e.g., `px-4 px-6` on the same element), and unreachable conditional branches.
- **Commented-Out Code**: Delete all commented-out blocks of JSX, CSS, or logic. Version control preserves history; dead comments rot and mislead readers.

## 2. Anti-Overengineering & Flat Architecture

Senior code optimizes for reading speed, not abstraction count:

- **Eliminate Single-Use Wrappers**: If a helper function, custom hook, or subcomponent is called once and merely forwards arguments without encapsulating meaningful domain logic or reusability, inline it.
- **Prop-Drilling Ceiling (Max 3 Levels)**: If a prop passes through more than 3 component layers without transformation, flatten the tree using React `children` composition, colocated data fetching, or a scoped Context.
- **Component Size Threshold (250 Lines)**: Flag any UI component exceeding 250 lines. Extract cohesive visual sections or stateful logic into custom hooks. If splitting creates new files across multiple components, place the refactor plan in the **Tier 2 Pending Approval Queue**.
- **Ban Deeply Nested JSX Ternaries**: Replace chained conditional ternaries inside JSX with early returns, clean lookup objects (`Record<Status, ReactNode>`), or small dedicated subcomponents.

## 3. Strict TypeScript & Async Safety

Never silence the compiler to ship faster:

- **Zero `any` Escapes**: Replace implicit `any`, lazy `as any` assertions, and `@ts-ignore` directives with accurate interfaces, discriminated unions, or `unknown` paired with runtime type guards.
- **Boundary Validation**: Validate all external data (API responses, URL search params, form payloads, `localStorage` reads) using strict schemas (e.g., Zod) rather than trusting type casts.
- **Unhandled Promises & Race Conditions**:
  - Every `async` function invoked from an event handler or effect must handle rejections (`try/catch` with user feedback or logging).
  - Every `useEffect` that fetches data or subscribes to events must clean up via `AbortController` or a cancellation flag to prevent state updates on unmounted components and stale race overwrites.

## 4. Bundle & Rendering Discipline (Next.js / React / Vanilla)

- **Push `'use client'` to the Leaves**: Never mark a page or high-level layout `'use client'` just because one button, modal, or animation needs interactivity. Keep data-fetching and static structure as Server Components and isolate interactivity into small client leaf components.
- **Tree-Shakeable Imports**: Replace full-library barrel imports (e.g., `import _ from 'lodash'`, `import * as Icons from ...`) with targeted subpath imports (`lodash-es/debounce` or specific icon imports).
- **Derived State Over Sync Effects**: Never use `useEffect` to synchronize one piece of state from props or another state variable; compute derived values directly during render (using `useMemo` only when computation is genuinely expensive).
