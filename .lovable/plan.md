
# Personal Life OS — Foundation Plan

Scalable single-user web app with proper multi-user auth, built on Lovable Cloud + Google sign-in. Design: **Soft Lavender** — off-white lilac backgrounds (#F6F4FA), muted plum accents (#6B5B95), rounded, calm, journal-like. Installable PWA with a share target route.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud, then apply one migration:

- `profiles` — id (FK auth.users), display_name, avatar_url, preferences jsonb, timestamps. Auto-create via `on_auth_user_created` trigger.
- `tasks` — id, user_id, title, description, priority (enum high/medium/low), due_date, due_time, reminder_at, status (enum active/completed), completed_at, created_at, updated_at.
- `journal_entries` — id, user_id, entry_date, title, body, mood (smallint 1–5), tags text[], image_urls text[], timestamps.
- `archive_items` — id, user_id, title, description, notes, tags text[], item_type (enum file/link/note/image/pdf/doc), url, file_path, file_mime, file_size, source (e.g. 'share','manual'), created_at, updated_at.

RLS on all four: owner-only via `auth.uid() = user_id` (profiles keyed by id). Full GRANT block for `authenticated` + `service_role`, plus `TO anon` withheld. Storage bucket `archive` (private) with owner-scoped policies on `storage.objects` keyed by first path segment = user id.

Search: enable `pg_trgm`; add trigram GIN indexes on task/journal/archive text columns for global search. Architecture leaves room for pgvector semantic search later.

## 2. Authentication

- Configure Google via `supabase--configure_social_auth`.
- `/auth` public route: Google button (via `lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })`) and email/password fallback.
- Managed `_authenticated/` layout gates the app subtree.
- Root `onAuthStateChange` wired per integration rules (SIGNED_IN/OUT/USER_UPDATED only).
- Sign-out follows the four-step teardown.

## 3. App Shell & Navigation

- `src/routes/_authenticated/route.tsx` (integration-managed) wraps app.
- `_authenticated/_layout.tsx` renders the persistent shell: sidebar on desktop, bottom tab bar on mobile, top bar with global search + Quick Add + Quick Capture.
- Nav items: Dashboard, Tasks, Journal, Archive, Learn & Inspire (placeholder), Settings.

## 4. Routes

```
/auth
/_authenticated/
  index               → Dashboard
  tasks               → list + filters
  tasks.new, tasks.$id
  journal             → list
  journal.new, journal.$id
  archive             → grid + filters
  archive.new         → upload/link/note
  archive.$id
  learn               → placeholder card
  settings
/capture              → public quick-capture landing (share target); redirects to /auth then /_authenticated/archive/new prefilled
```

## 5. Feature scope this build

- **Dashboard**: today's tasks, next 7 days, recent 3 journal entries, recent 6 archive items, Quick Add (task) and Quick Capture (archive) dialogs.
- **Tasks**: full CRUD, complete/restore, priority chips, due date/time, search + filter (status/priority/tag/date), completed history view. Reminder field stored; notification wiring deferred.
- **Journal**: full CRUD entries with mood (1–5 emoji scale), tags, optional image uploads to `archive` bucket under `journal/` prefix, search, tag filter.
- **Archive**: upload files (image/pdf/doc/other), save link (with title/notes), save text note. Grid with type filter, tag filter, search. Preview: images inline, PDFs via `<embed>`, others show download.
- **Global search**: single server fn queries all three tables with trigram similarity, returns typed results grouped by module.
- **Settings**: profile (name/avatar), theme toggle (light/dark lavender), export JSON (tasks + journal + archive metadata), Google account info, sign out.

## 6. PWA (installable only)

- `public/manifest.webmanifest` with name, theme #6B5B95, background #F6F4FA, `display: standalone`, icons (192/512, maskable), and a `share_target` entry:
  ```
  share_target: { action: "/capture", method: "GET", params: { title, text, url } }
  ```
- Head tags in `__root.tsx`: manifest link, theme-color, apple-touch-icon.
- No service worker (per PWA skill: manifest-only for install).
- `/capture` route reads title/text/url query, requires auth (redirects preserving `next`), then opens the "Save to Archive" form prefilled — same form reused as manual Quick Capture.

## 7. Design System (Soft Lavender)

Tokens in `src/styles.css`:
- background `oklch(0.97 0.015 300)` (#F6F4FA), foreground `oklch(0.22 0.03 300)` (#2A2438)
- primary `oklch(0.52 0.08 300)` (#6B5B95), primary-foreground near-white
- muted/accent from #E5DEF0 range, border soft lilac
- Radius 0.875rem, generous spacing, soft shadow `0 8px 24px -12px color-mix(in oklab, var(--primary) 25%, transparent)`
- Fonts: Instrument Serif display for headings, Inter for body (loaded via `<link>` in root head, referenced in `@theme`)
- Dark mode: deep plum bg `oklch(0.22 0.03 300)`, lilac accents preserved
- Framer Motion for gentle page/list transitions; restrained micro-interactions

## 8. Reusable primitives

- `<PageHeader>`, `<EmptyState>`, `<TagInput>`, `<PriorityBadge>`, `<MoodPicker>`, `<FileDropzone>`, `<QuickAddDialog>`, `<QuickCaptureDialog>`, `<GlobalSearch>` (cmdk).
- Server fns per module in `src/lib/<module>.functions.ts` using `requireSupabaseAuth`; list/get/create/update/delete + module-specific actions (complete/restore, uploadArchiveFile signed URL).
- React Query for all reads via `ensureQueryData` in loaders + `useSuspenseQuery` in components.

## 9. Out of scope (deliberately deferred)

- Notification delivery, Google Calendar sync, external reminder systems
- Offline service worker / full offline PWA
- AI semantic search, embeddings
- Learn & Inspire feature body (placeholder page only)
- Additional share targets (Gmail/Drive) — architecture ready via `source` column

## Technical notes

- TanStack Start file routes, dot-separated naming.
- Public `/auth` and `/capture` routes stay outside `_authenticated/`; `/capture` handles its own auth check + redirect-back to preserve share params.
- Storage paths namespaced `{user_id}/archive/...` and `{user_id}/journal/...`; RLS on `storage.objects` uses `split_part(name,'/',1) = auth.uid()::text`.
- Head metadata: real title "Personal Life OS" + description on `__root.tsx`; per-route heads on `/auth`.
- All CRUD writes via `createServerFn` + `requireSupabaseAuth`; browser only talks to Supabase for auth session and realtime (none this build).
