## Quick Learning — three fixes

### 1. Open content in the external browser
- In `src/routes/_authenticated/learn.tsx`, both "Open" buttons (recommendation card + saved item card) currently use `<a target="_blank">`. Inside the installed PWA on Android, this can still open inside the app's webview.
- Replace those anchors with a plain button that calls `window.open(url, "_blank", "noopener,noreferrer")`. Combined with `rel="noopener"`, Android treats this as an external intent and opens the system browser, keeping the app usable underneath.

### 2. Duration matching — only recommend items that fit
- Strengthen the AI prompt in `recommendLearning` (`src/lib/learning.functions.ts`):
  - Explicit rule: `duration_minutes` MUST be ≤ requested minutes. Never return a longer item, even if the series/channel is a good match. For podcasts, pick a specific short episode; for videos, pick a short-form clip / TED-Ed / Short. For text, pick an article whose read time fits.
  - Ask for at least 5 candidates so post-filtering still yields results.
- Add a server-side hard filter after parsing: drop any item where `duration_minutes > requested + 1` (small tolerance). Keep the existing URL-availability check; return up to 3 valid items.

### 3. New "Started / התחלתי" tab
Behavior:
- Tapping **Open content** on any card auto-marks the item as `in_progress` (and, for a Discover recommendation not yet saved, auto-creates the row with that status). "Save for later" from Discover keeps working exactly as today and lands in **My List**.
- New tab **התחלתי / Started** sits between **My List** and **Completed**. It lists items with status `in_progress` and allows: reopen link (again auto-updates timestamp), **Mark completed** (moves to Completed), **Move to My List**, **Delete**.
- Completing or reopening from other tabs also works as today.

Data model:
- Extend the status enum used in the app to include `in_progress`. `learning_items.status` is currently a `text` column (schema shows no enum) — no migration required; just widen the Zod `statusEnum` and add the value in queries. If a DB CHECK exists, add a migration to allow `in_progress`. (Will verify with `supabase--read_query` at build time before deciding on the migration.)
- Add optional `started_at` tracking by reusing `updated_at` ordering — no schema change.

Server (`src/lib/learning.functions.ts`):
- Add `statusEnum` value `in_progress`.
- Add `markLearningItemStarted({ id })` — sets status to `in_progress` if currently `saved`/`recommended`, leaves `completed` untouched, bumps `updated_at`.
- Add `startRecommendation({ ...recommendationFields })` — inserts a new row with status `in_progress` (used when opening a Discover recommendation the user never saved).

UI (`src/routes/_authenticated/learn.tsx`):
- Add fourth `TabsTrigger`/`TabsContent` for `in_progress` between `list` and `completed`.
- `RecommendationCard` "Open" click → `startRecommendation` mutation, then `window.open`. Invalidate `learn-items`.
- `SavedItemCard` "Open" click on a saved (My List) item → `markLearningItemStarted`, then `window.open`.
- Started tab reuses `SavedItemCard` with actions: Open, Mark completed, Move to My List (sets status back to `saved`), Delete.

Localization (`src/lib/i18n.ts`):
- Add keys: `learn.tab.inProgress` ("התחלתי" / "Started"), `learn.moveToList`, `learn.emptyInProgress`, plus any new button labels.

### Out of scope
- No changes to auth, RLS, or other modules.
- Voice assistant, share target, dashboard remain untouched.
