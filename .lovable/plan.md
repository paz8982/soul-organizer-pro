# Wear OS Voice Companion for Soul Organizer

## Goal
Build a Wear OS app that lets you tap, speak, and automatically create a task, journal entry, or archive item in your Soul Organizer web app — in the same language the app is currently set to (Hebrew/English).

## What this plan covers
Because Soul Organizer is a web app, the Wear OS app itself is a separate Android project. This plan first builds the **web backend and pairing flow** that the watch will talk to, then provides the **Wear OS starter project** you can build in Android Studio.

## Architecture
```text
┌─────────────────┐      voice/audio      ┌──────────────────┐
│   Wear OS app   │ ────────────────────▶ │  Soul Organizer  │
│  (Android native)│   + device token     │  /api/public/wear/voice
└─────────────────┘                       │   (server route) │
                                           └────────┬─────────┘
                                                    │
                            ┌──────────────────────┼──────┐
                            ▼                      ▼      ▼
                    Lovable AI STT          Lovable AI intent    Supabase create
                    (audio → text)          (text → action)     task/journal/archive
```

## Part 1 — Web app backend

### 1.1 Database: add `wear_devices` table
Store pairing tokens for each watch. One user can have multiple devices.

| Column | Purpose |
|--------|---------|
| `id` | UUID primary key |
| `user_id` | links to auth.users |
| `label` | e.g. "Galaxy Watch" |
| `token_hash` | SHA-256 hash of the pairing token (never store raw token) |
| `token_last_four` | last 4 chars for display |
| `enabled` | revoke without deleting |
| `last_used_at` | audit |
| `created_at` / `updated_at` | timestamps |

Migration will also include:
- `GRANT` to authenticated and service_role
- RLS enabled
- policies: users can only manage their own devices
- `update_updated_at_column` trigger

### 1.2 Server route: `POST /api/public/wear/voice`
A public HTTP endpoint that the watch calls directly. It is public because the watch cannot participate in the web app's Google OAuth session, but it is protected by a device token.

Flow:
1. Read `X-Wear-Token` header.
2. Look up `wear_devices` where `token_hash` matches and `enabled = true`.
3. If not found → return `401`.
4. Receive `audio` file (multipart/form-data) and optional `locale` (`he`/`en`).
5. Reuse the existing transcription + intent logic from `src/lib/voice.functions.ts`.
6. Call the same actions the current voice assistant calls:
   - `task` → create task
   - `journal` → create journal entry
   - `search_archive` → save a searchable archive item with the query text
   - unknown → still return transcript so the watch can show it
7. Update `last_used_at`.
8. Return JSON: `{ success, action, transcript, title, url }`.

To make this work, the voice-processing logic will be extracted into a shared server-only helper (`src/lib/voice-processing.server.ts`) that both the existing `processVoiceCommand` server function and the new public route can call.

### 1.3 Settings page: manage watch pairing
Add a new "Wear OS" card in `src/routes/_authenticated/settings.tsx`.

Features:
- **Generate pairing token** — shows a random token once, with a copy button and a QR code. The raw token is shown only once; the app stores only its hash.
- **List connected watches** — label, last 4 chars of token, last used time.
- **Revoke / rename** — disable or delete a device.
- Server functions for CRUD on `wear_devices`.

## Part 2 — Wear OS app (separate Android project)

A starter project will be added under `/wear-os/` in the Soul Organizer repo. It requires Android Studio to build and deploy to a watch.

### 2.1 Tech stack
- Wear OS 3+ (API 30+)
- Jetpack Compose for Wear OS
- Kotlin
- Coroutines + Ktor client (or OkHttp) for the HTTP call
- Wearable Voice Recognition (record PCM/WAV)

### 2.2 Watch UI
Single screen optimized for the watch:
- Large circular tap-to-record button.
- While recording: show waveform/pulse animation and a "Stop" button.
- After processing: show created item type + title + success/error.
- Auto-close after 2 seconds on success.
- Swipe-down to open settings to enter/paste the pairing token.

### 2.3 Recording on Wear OS
- Use `MediaRecorder` or `AudioRecord` to capture a WAV file.
- Send the WAV file to `POST /api/public/wear/voice` with the stored device token in the `X-Wear-Token` header.
- Prefer 16 kHz mono WAV (small, decodable everywhere).

### 2.4 Pairing flow
- During first launch, the watch app shows a text field for the pairing token from Soul Organizer Settings.
- Token is stored in EncryptedSharedPreferences.
- Optional: scan QR code from the phone using the watch camera (if available) to avoid typing.

### 2.5 What the watch can create
Same as the web voice assistant:
- "Add a task called call mom tomorrow at 6" → creates a task.
- "Journal entry: I had a great meeting today" → creates journal entry.
- "Search archive for vacation ideas" → creates an archive note with the query.
- Hebrew and English are both supported based on the `locale` param sent from the watch.

## Part 3 — Security
- Pairing tokens are 32-byte random strings, hashed with SHA-256 in the database.
- Raw token is shown only once during pairing.
- Devices can be revoked from Settings.
- The route returns no user data beyond the created item summary.
- `last_used_at` is updated for audit.
- Token is sent over HTTPS only (the watch calls the published production URL).

## Part 4 — Files to create/modify

### Web app changes
- `supabase/migrations/...` — create `wear_devices` table, RLS, grants, trigger.
- `src/lib/voice-processing.server.ts` — shared transcription + intent helper.
- `src/lib/voice.functions.ts` — refactored to use the shared helper.
- `src/lib/wear-devices.functions.ts` — CRUD server functions for pairing tokens.
- `src/routes/api/public/wear/voice.ts` — public server route for the watch.
- `src/routes/_authenticated/settings.tsx` — add Wear OS pairing UI.
- `src/lib/i18n.ts` — new Hebrew/English keys for the settings card.
- `public/manifest.webmanifest` — optionally add a Wear OS shortcut is not needed because the app is a separate install.

### Wear OS project (new `/wear-os/` directory)
- `wear-os/build.gradle.kts` / `settings.gradle.kts`
- `wear-os/app/src/main/AndroidManifest.xml`
- `wear-os/app/src/main/java/.../MainActivity.kt`
- `wear-os/app/src/main/java/.../WearApp.kt` (Compose UI)
- `wear-os/app/src/main/java/.../VoiceRecorder.kt`
- `wear-os/app/src/main/java/.../SoulApi.kt` (Ktor client)
- `wear-os/app/src/main/java/.../TokenStorage.kt`
- `wear-os/README.md` — how to build, pair, and install.

## Part 5 — Testing & delivery plan
1. Merge web backend changes and publish the Soul Organizer app.
2. In Settings → Wear OS, generate a pairing token.
3. Open the Wear OS project in Android Studio, update `BASE_URL` to your published URL.
4. Run the watch app on a real watch or emulator.
5. Enter the pairing token, tap record, speak, and verify a task/journal/archive item appears in the web app within seconds.

## Deliverables
- Wear OS pairing and voice API in the Soul Organizer web app.
- A complete starter Wear OS project ready to build in Android Studio.
- Documentation for pairing and building.

## Notes
- The Wear OS app is **not** built inside Lovable; it is a separate Android native project. Lovable handles the web backend and pairing UI; Android Studio handles the watch app.
- If you want a shortcut that feels "instant" without installing a watch app, the existing PWA voice shortcut (`/dashboard?action=voice`) already works from the phone. The Wear OS app is the next step for watch-only capture.
