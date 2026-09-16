# Add a "New Task" phone shortcut

## Goal
A third home-screen shortcut on the phone that opens the app directly into the new-task form, ready to type.

## Current behavior
- The phone has two PWA shortcuts defined in `public/manifest.webmanifest`: the main app (`/`) and "Voice Assistant" (`/dashboard?action=voice`).
- The `?action=voice` parameter is handled in `src/components/app-shell.tsx`: it auto-opens the voice dialog and strips the parameter so refreshes don't reopen it.
- The Tasks page (`src/routes/_authenticated/tasks.tsx`) opens its new-task form as a dialog via `setEditing({ ...emptyDraft })` — there is no separate new-task URL.

## Changes

1. **`public/manifest.webmanifest`** — add a second entry to `shortcuts`:
   - Name (Hebrew): "משימה חדשה", short name "משימה"
   - URL: `/tasks?action=new`

2. **`src/routes/_authenticated/tasks.tsx`** — handle the parameter with the same pattern as the voice shortcut:
   - On page load, if the URL contains `action=new`, immediately open the new-task dialog (same call as the existing "+" button).
   - Strip the parameter from the address so refreshes/back navigation don't reopen the dialog.

## Result
Long-pressing the app icon on Android will show three shortcuts: open app, microphone, and "New Task" — the last one lands on the Tasks page with the input form already open.

No backend, data, or visual changes.
