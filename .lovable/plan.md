## Groceries (רשימת קניות)

A new section alongside Tasks/Journal/Archive, in Hebrew + English, RTL-safe.

### What you get
- **Add** items fast: one input for the name + a small quantity field (defaults to 1).
- **Check off**: tap an item to mark it as bought — it stays on the list with a strikethrough and moves to the bottom. Tap again to un-check.
- **Delete**: X button on each row removes it permanently. A "נקה שנקנו / Clear bought" button clears all checked items at once.
- **Export**: a share button opens the Android share sheet with the list as plain text, so you can send it to Google Keep, WhatsApp, Gmail, etc. On desktop (no share support) it falls back to copying the text to the clipboard with a toast confirmation.

Note on Google Keep: Google has no public API for creating notes from a web app, so a direct "save to Keep" button isn't possible. The share sheet on Android lists Keep as a target, which is the closest equivalent — one tap and the list lands in a new Keep note.

Exported text looks like:
```text
רשימת קניות — 30.7.2026
• חלב × 2
• לחם
• עגבניות × 6
```
(Bought items are excluded by default.)

### Technical details

**Database** — one migration creating `public.grocery_items`:
- `id`, `user_id`, `name` (text), `quantity` (int, default 1), `is_bought` (bool, default false), `position` (int for ordering), `created_at`, `updated_at` + updated-at trigger.
- GRANTs for `authenticated` and `service_role`, RLS enabled, single policy scoping all access to `auth.uid() = user_id`.

**Server** — `src/lib/groceries.functions.ts` with `createServerFn` + `requireSupabaseAuth`, following the same shape as `tasks.functions.ts`: `listGroceries`, `addGroceryItem`, `updateGroceryItem` (toggle bought / edit name+qty), `deleteGroceryItem`, `clearBoughtGroceries`.

**Route** — `src/routes/_authenticated/groceries.tsx` using the loader + `useSuspenseQuery` pattern, its own `head()` with a unique title/description, `errorComponent`/`notFoundComponent`, and the existing `PageHeader`/`EmptyState` primitives.

**Navigation** — add a `ShoppingCart` entry to `NAV` in `src/components/app-shell.tsx` (sidebar + mobile bottom bar).

**Export helper** — uses `navigator.share({ text })` when available, otherwise `navigator.clipboard.writeText` with a sonner toast.

**i18n** — new `groceries.*` keys in `src/lib/i18n.ts` for both Hebrew and English.

Out of scope for now: voice-assistant integration, dashboard widget, categories/aisles. Easy to add later if you want them.
