## Quick Learning — Rating on completion

Add a 3-level rating (didn't like / liked / loved) captured when an item is marked as completed, then feed it back into the AI recommender so future suggestions favor what the user liked and avoid what they didn't.

### Data
- Add nullable column `rating smallint` to `public.learning_items` with a CHECK `rating IN (-1, 1, 2)` (thumb down / thumb up / two thumbs up). No enum needed; keeps math easy for aggregation.
- Migration only adds the column; existing rows stay `NULL`.

### Server (`src/lib/learning.functions.ts`)
- Extend `updateLearningItem` patch schema with `rating: z.union([z.literal(-1), z.literal(1), z.literal(2)]).nullable().optional()`.
- In `recommendLearning`, before calling the AI, fetch the user's rated history via the authenticated supabase client:
  - Liked/loved (rating >= 1): pull last ~20 titles + sources + category, split into "loved" (2) and "liked" (1).
  - Disliked (rating = -1): pull last ~20 titles + sources.
- Inject into the system prompt as two short bulleted lists ("The user loved / liked these — prefer similar creators, topics, styles" and "The user disliked these — avoid similar"). Keep prompt bilingual (he/en) matching current pattern.
- Keep existing duration filter and URL availability check.

### UI (`src/routes/_authenticated/learn.tsx`)
- On the Completed action ("Mark completed") in `SavedItemCard` and in the Started tab: after marking complete, open a small inline rating row (or a compact dialog) with 3 icon buttons using lucide `ThumbsDown`, `ThumbsUp`, and a doubled `ThumbsUp` (two side by side) — with `aria-label` from i18n. Selecting one calls `updateLearningItem` with `{ rating, status: "completed", completed_at: now }`.
- In the Completed tab, show the current rating as small icons on each card, and allow changing it by tapping a different icon (same 3-button row, highlighting the active one).
- Recommendation cards get no rating UI (only completed items are rated).

### i18n (`src/lib/i18n.ts`)
Add keys (he/en):
- `learn.rate.prompt` — "איך היה?" / "How was it?"
- `learn.rate.disliked` — "לא אהבתי" / "Didn't like"
- `learn.rate.liked` — "אהבתי" / "Liked"
- `learn.rate.loved` — "אהבתי מאוד" / "Loved"

### Out of scope
- No changes to Discover wizard inputs, auth, other modules.
- No aggregate analytics UI; ratings are only used to steer the AI.
