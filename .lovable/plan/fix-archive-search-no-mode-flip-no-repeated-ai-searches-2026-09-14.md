# Fix archive search: no mode flip, no repeated AI searches

## Problems

1. A plain text search only stores the words in the page address, not the search mode. When you come back from an item, the page guesses "smart" because words are present — so a regular search turns into an AI search.
2. The AI search is re-run every time you return to the list, spending credits each time.

## What changes

- The chosen search mode (regular / tags / smart) is always kept in the page address, so returning from an item restores exactly the mode you used. When no mode is stored, default to regular search — never guess smart.
- AI search results are cached per search text. Going into an item and back shows the previous answer and results instantly, with no new AI call. Only typing a new query (or pressing the search button again for the same query) triggers a new AI call.
- Cached results survive for the session; a manual re-run stays available via the search button.

## Technical notes

In `src/routes/_authenticated/archive.index.tsx`:
- Remove the `smart || q ? "smart" : "text"` fallback; use `urlSearch.mode ?? "text"` and keep the legacy `smart=true` param mapping to mode `smart` in `validateSearch`.
- Have `setSearch` preserve the current mode explicitly so text searches persist `mode=text`.
- Replace the `useMutation` + `useEffect` auto-run with `useQuery`:
  - `queryKey: ["archive-smart", locale, q]`, `queryFn: () => smartSearchArchive({ data: { query: q, locale } })`
  - `enabled: mode === "smart" && q.trim().length >= 2 && armed`
  - `staleTime: Infinity`, `gcTime` long, `refetchOnMount: false`, `refetchOnWindowFocus: false`
  - "armed" flag set when the user presses Enter/search or when the query already exists in the cache (`queryClient.getQueryData`), so a deep link with cached data renders instantly and a fresh deep link runs once.
- Read results/answer/loading from the query; `clearSmart` clears the query param and local armed flag without invalidating the cache.
- Manual re-run calls `refetch()`.

No backend or server-function changes.
