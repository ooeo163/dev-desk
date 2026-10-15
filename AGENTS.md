# AGENTS.md

Guidance for coding agents working in DevDesk. Verified against the working tree on 2026-10-15, including the uncommitted project-notes module. See README.md for user-facing setup and PROJECT_ANALYSIS.md for current limitations.

<!-- BEGIN:nextjs-agent-rules -->
## Next.js Version Warning

This project uses **Next.js 16.2.9**. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code and heed deprecations. Keep `src/proxy.ts`: the middleware convention is deprecated in Next.js 16. Proxy defaults to Node.js; setting a `runtime` option in the proxy file is unsupported.
<!-- END:nextjs-agent-rules -->

## Commands and Verification

| Command | Description |
|---|---|
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Development server, default http://localhost:3000 |
| `npm run build` | Production build; does not run ESLint automatically |
| `npm run start` | Serve the existing production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit --incremental false` | TypeScript check without generated output |
| `npm run db:generate` | Generate migration after a schema change |
| `npm run db:migrate` | Apply migrations eligible by journal timestamp |
| `npm run db:studio` | Inspect database using Drizzle Studio |

No test runner is configured. On 2026-10-15, TypeScript passed; ESLint reported 15 errors and 10 warnings. Treat these as a dated baseline, not permission to ignore new issues. No production build or browser regression was performed during the documentation update.

## Architecture

DevDesk is a Chinese (`zh-CN`), local-first web workbench for credentials, tasks, weekly work logs and project notes. SQLite is local to the Node.js server, not browser storage. Application version is `0.1.0`; dependency versions are pinned/resolved in package.json and package-lock.json.

- Next.js App Router + React 19.2.4 + TypeScript.
- Tailwind CSS v4, shadcn/ui base-nova (Base UI), lucide-react, sonner.
- Zustand stores unlock state and the DEK in memory; React Query manages server state.
- Tiptap edits task descriptions as HTML. Project notes use a plain textarea.
- Data reads and application writes live in `src/actions/`; schema migrations and the legacy tag script also write data outside this application path.
- ExcelJS generates ordinary, unencrypted `.xlsx` exports for credentials, tasks and work logs. The added archiver dependencies are not connected to an export feature.

## Encryption Model

Understand the actual trust boundary before editing encryption or auth:

1. Initialization/unlock sends the master password to `src/actions/auth.ts` for server-side verification. `vault_meta` holds the password verifier and KDF salt.
2. The browser derives a 256-bit DEK using Web Crypto PBKDF2, 600,000 iterations and SHA-256 (`src/lib/client-crypto.ts`). The DEK remains in the Zustand store until lock/reload; it is not persisted in browser storage.
3. Credential actions receive the DEK as Base64 and use Node `crypto` in `src/lib/crypto.ts` to encrypt/decrypt. Tasks, work logs and project notes do not use the DEK.
4. Only credential password, API Key, TOTP Secret and credential notes are AES-256-GCM encrypted at rest. Titles, usernames, addresses, tags, task descriptions, work logs and project-note content are plaintext.
5. Cipher payload: Base64 of `iv(16) + authTag(16) + ciphertext`; KDF salt is separate. The older encrypt JSDoc incorrectly includes salt in its format description; follow the implementation.

KDF settings must match in both crypto modules. Do not claim zero knowledge or that the DEK never reaches the server. Credential export returns decrypted secrets in an unencrypted workbook. The export dialog re-verifies the master password; the export action itself accepts a DEK and does not independently enforce that re-verification.

## Session and Route Protection

- `auth.ts` sets `vault_session` as HMAC-SHA256 signature + expiry, with a 24-hour lifetime, `httpOnly`, `sameSite=lax` and currently `secure=false`.
- `src/proxy.ts` matches only `/dashboard/:path*`. It checks cookie presence, two-part format and expiry, but does not validate the HMAC or explicitly reject non-numeric expiry.
- `verifySession()` exists in auth.ts but is not called by data Actions. Do not describe current route protection as complete authentication.
- `src/app/dashboard/layout.tsx` also checks the in-memory unlock flag and redirects locked clients to `/`.
- `/quick-search` is outside the proxy matcher and has no page-level session check.
- `useAutoLock` clears the DEK/unlock state and session cookie after inactivity. Default is five minutes; settings allow 1/5/10/30 minutes or disabled. Lock does not explicitly clear the React Query cache.

These are existing limitations. Any security repair must validate authorization in the relevant server entry points, not rely solely on a client redirect or Proxy matcher.

## Database and Migrations

SQLite via better-sqlite3 at `data/vault.db`, opened relative to `process.cwd()`, with WAL and foreign keys enabled. Ensure the `data` directory exists. Drizzle schema is `src/lib/db/schema.ts`; configuration is `drizzle.config.ts`. IDs use nanoid.

| Table | Current role |
|---|---|
| `credentials` | Credential metadata and encrypted secret fields; tags stored as JSON tag IDs |
| `tags` | Credential tag catalog; unique name |
| `tasks` | Plaintext HTML descriptions, state, priority and optional credential reference |
| `work_logs` | Week boundaries, project_progress, task_details and timestamps |
| `work_log_items` | Legacy retained table; no current Action/page consumer |
| `notes` | Project, title, plaintext content, independent JSON string tags and timestamps |
| `vault_meta` | Password verifier, KDF salt and auto-lock setting |

Drizzle additionally maintains `__drizzle_migrations`. Current tasks do not sync to work logs, and new weekly records do not inherit project progress.

After intentional schema changes, generate and review SQL/snapshots/journal, then apply in the appropriate environment. Do not generate migrations on every startup or assume migrations are applied automatically.

**Known migration inconsistency:** `0005_notes_table` has journal timestamp `1754379000000`, earlier than `0004` (`1781409057434`), and no corresponding 0005 schema snapshot. The installed SQLite migrator compares timestamps, so a database already at 0004 skips 0005. The local database checked on 2026-10-15 already contains `notes` but records only migrations 0000–0004. Back up and inspect both schema and history before repairing; do not blindly rerun CREATE TABLE or rewrite applied history.

`src/lib/db/migrate-tags.ts` is a one-off legacy name-to-ID data migration, not an automatic or safely repeatable startup step. `backup.bat` copies the SQLite files sequentially to a machine-specific path; it is not an online-consistent backup implementation.

## State and Data Fetching

React Query defaults: staleTime 30 seconds, gcTime 5 minutes, refetchOnWindowFocus false. Data mutations combine `revalidatePath` with client `refetch()`/`invalidateQueries` where implemented.

- Credentials are loaded in full and filtered client-side by title/username, type and tag.
- Tasks use server pagination (default 20), status filtering and priority/creation ordering; board columns paginate independently.
- Command palette and quick search load at most 200 tasks, so they do not search the complete task history.
- Project notes use server LIKE search across project/title/content. Existing content changes debounce for 800ms; new notes and header metadata use manual save.
- Weekly project/task text saves on blur. Keep this distinct from notes autosave.

## UI Conventions

Use existing component patterns. Do not hand-edit `src/components/ui/` primitives; add/re-add shadcn components through `npx shadcn@latest add <component>` when needed. Keep feature-specific customization in business components. Icons use lucide-react; feedback uses sonner. Alias `@/*` maps to `src/*`.

ThemeProvider defaults to dark and supports light/dark/system. Credentials and notes have separate tag semantics: credential tags are IDs from `tags`, project-note tags are independent strings. Credential type is inferred from tag names in `src/lib/credential-types.ts`, not a persisted type column.

`window.electronAPI` is optional integration with an external host. This repository includes declarations and a quick-search page, but no Electron main/preload implementation or packaging scripts; do not promise native RDP functionality from a browser-only run.

## Routes

| Route | Purpose |
|---|---|
| `/` (`(auth)`) | Master password setup/unlock |
| `/dashboard` | Stats, recent credentials/tasks and week navigation/editing |
| `/dashboard/credentials` | Credential CRUD, tag/type filters and export |
| `/dashboard/tasks` | Paginated task board |
| `/dashboard/work-logs` | Current/historical weekly records and export |
| `/dashboard/notes` | Project notes (working-tree addition) |
| `/dashboard/settings` | Theme and auto-lock |
| `/quick-search` | Standalone search compatible with external Electron host |

## Environment and Deployment

Set `SESSION_SECRET` in `.env.local`. Code currently falls back to a built-in development secret if absent; use an explicit random value. `PORT` and `NODE_ENV` control the server runtime. Do not expose environment values or database contents in diagnostics.

`ecosystem.config.js` configures PM2 app `dev-desk`, working directory `D:\workspace\dev-desk`, direct Next `start`, production mode, port 3001, one instance, restart threshold 256M. On 2026-10-15 the running PM2 process matched this directory and port; its build revision was not verified. `next start` serves `.next`, so source changes need a successful build and process restart. Documentation changes do not require either. Do not restart the user's running service or migrate their data as part of a documentation-only task.

## Validation and Repository Hygiene

For new business inputs, use schemas in `src/lib/validation.ts`; keep action return conventions and client error handling consistent. Some existing settings/auth checks are handwritten, not evidence that every current input uses Zod.

Preserve existing uncommitted work. Do not commit or upload secrets, SQLite data or exports. `data/` and `.env*` are ignored, but root `vault.db.backup` is not currently ignored. AGENTS.md, CLAUDE.md and UI-REVIEW.md have been explicitly included in the documentation commit; their existing .gitignore patterns do not prevent updates to tracked files. Keep `.workbuddy/` tool history local unless specifically requested.
