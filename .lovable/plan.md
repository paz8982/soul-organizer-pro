Add a tag-only search option to the archive and clean up the busy header.

## Current state
- `src/routes/_authenticated/archive.index.tsx` has the search bar on one row, then the Smart Search button and type filter on a second row, plus a hint line below that. The voice assistant and main UI reuse the same Smart Search AI path, which can be expensive for simple queries.

## Goals
1. Let users search by tags without calling the AI (saves tokens).
2. Make the archive header feel less crowded, especially on mobile.
3. Improve the default text search so multi-word queries match in any order.

## Proposed changes

### 1. Layout cleanup
Replace the multi-row header with one compact search/filter bar:
- Single full-width search input row.
- One "mode" toggle right inside the input (or immediately beside it): **Smart** / **Text** / **Tags**.
- Move the type filter and any extra filters into a collapsible **Filters** panel on mobile, or a compact inline row on desktop.
- Remove the standalone Smart Search button; the AI mode is triggered by pressing Enter in the search field.
- Use a horizontal chip list for active filters so the user sees what’s applied at a glance.

### 2. Text mode — wildcard word search (default)
- Split the query on whitespace and require every word to appear somewhere in the item text (title + description + notes).
- Example: `pasta recipe` will match `this is a recipe for pasta` because both words are present.
- This is a cheap client-side search and works for both Hebrew and English.

### 3. Tag search mode
- Add a `tag` filter state in `archive.index.tsx`.
- Compute a unique tag list from all loaded archive items.
- When mode is **Tags**, show a tag selector or an input field that narrows the tag list. Selecting a tag filters items client-side where `item.tags.includes(selectedTag)`.
- When a tag is active, disable the AI search and only run the cheap client-side filter.
- Add translation keys for "Tags", "Search by tag", "All tags", and clear-filter labels in both `he` and `en`.

### 4. Smart mode
- Keep the existing AI semantic search.
- Only run when the mode toggle is set to **Smart** and the user submits the query.
- Show the AI answer card as today, but only when Smart mode is active.

### 5. Files to edit
- `src/routes/_authenticated/archive.index.tsx` – main layout, filter logic, state, mode switch, and wildcard text search.
- `src/lib/i18n.ts` – new Hebrew and English strings for tag mode, wildcard hint, and filter labels.
- Possibly reuse existing `Select`/`Input` components; no new UI library needed.

### 6. Out of scope
- No database changes (tags already exist on `archive_items`).
- No server function changes (tag and text filters are client-side).
- No changes to the Smart Search AI model.

## Acceptance criteria
- Tag search works without any AI call.
- Text mode matches words in any order (wildcard style).
- The archive header looks cleaner on mobile and desktop.
- Both languages and RTL layout remain intact.
- Existing Smart Search behavior still works when selected.