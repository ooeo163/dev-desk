# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

<!-- BEGIN:nextjs-agent-rules -->
## Next.js Version Warning

This project uses **Next.js 16.2.9** — APIs, conventions, and file structure may differ from older versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to the SQLite database |
| `npm run db:studio` | Open Drizzle Studio for database inspection |

No test runner is configured.

## Architecture Overview

**DevDesk** is a local-first, privacy-oriented developer workbench for managing credentials and task notes. The UI is in Chinese (zh-CN). All sensitive data is encrypted at rest with AES-256-GCM; the server never stores plaintext secrets.

### Encryption Model (critical to understand)

The app uses a **master password → KDF → DEK** flow:

1. User sets a master password on first launch. A PBKDF2 salt is generated and stored in `vault_meta`.
2. On unlock, the server verifies the password hash, then returns the KDF salt to the client.
3. The **client** derives the Data Encryption Key (DEK) via Web Crypto API (`src/lib/client-crypto.ts`) and holds it in the Zustand store (`src/store/vault.ts`).
4. The DEK is passed as a Base64 string to Server Actions that need to encrypt/decrypt fields (`src/actions/credentials.ts`, `src/actions/tasks.ts`).
5. Server-side `src/lib/crypto.ts` performs the actual AES-256-GCM encrypt/decrypt using Node `crypto`.

KDF parameters (600k PBKDF2 iterations, SHA-256, 256-bit key) must match between `client-crypto.ts` and `crypto.ts`.

### Session & Route Protection

- Sessions use an HMAC-signed cookie (`vault_session`) set in `src/actions/auth.ts`.
- Route protection for `/dashboard/*` is handled by `src/proxy.ts` (Next.js 16 middleware equivalent — do **not** rename to `middleware.ts` without consulting the Next.js 16 docs).
- The `useAutoLock` hook locks the vault and redirects to `/` after an idle timeout.

### Data Layer

- **Database**: SQLite via `better-sqlite3`, stored at `data/vault.db` (WAL mode enabled).
- **ORM**: Drizzle ORM. Schema is in `src/lib/db/schema.ts`. Three tables: `credentials`, `tasks`, `vault_meta`.
- **Migrations**: Managed by `drizzle-kit`. Config in `drizzle.config.ts`. After schema changes run `npm run db:generate` then `npm run db:migrate`.
- IDs are generated with `nanoid`.

### State & Data Fetching

- **Zustand** (`src/store/vault.ts`) holds the unlock state and DEK in memory.
- **React Query** (`@tanstack/react-query`) is used for all server-state fetching with a 30s stale time. Query invalidation is done via `revalidatePath` in Server Actions plus `refetch()` on the client.
- Server Actions live in `src/actions/` and are the sole write path for data mutations.

### UI Conventions

- Built with **shadcn/ui** (base-nova style) + **Tailwind CSS v4**. Add components via `npx shadcn@latest add <component>`.
- `src/components/ui/` contains shadcn primitives — do not hand-edit these; re-add via the CLI if customization is needed.
- Icons come from `lucide-react`.
- Toasts use `sonner` (via `<Toaster />` in root layout and `toast()` calls).
- Path alias: `@/*` maps to `src/*`.

### Route Structure

| Route | Purpose |
|-------|---------|
| `/` (route group `(auth)`) | Master password setup / unlock |
| `/dashboard` | Stats overview |
| `/dashboard/credentials` | Credential CRUD with search/tag filter |
| `/dashboard/tasks` | Kanban-style task board (todo / in_progress / done) |

### Environment Variables

Only `SESSION_SECRET` is required (set in `.env.local`). Used for HMAC-signing session cookies. Change the default value for any non-local deployment.

### Validation

All inputs are validated with **Zod** schemas in `src/lib/validation.ts`. Always validate through these schemas rather than adding ad-hoc checks in actions.
