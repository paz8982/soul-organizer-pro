# Soul Organizer — Wear OS Voice Companion

This starter Android project adds a Wear OS watch face that lets you record a voice message and create tasks, journal entries, or archive notes in your Soul Organizer web app.

## What it does

1. Tap the big microphone button on the watch to start recording.
2. Tap again to stop and send the recording.
3. The audio is sent to `POST /api/public/wear/voice` on your published Soul Organizer app.
4. The server transcribes the Hebrew/English audio, decides what you wanted (task, journal, or archive), and creates it automatically in your account.
5. The watch vibrates and shows a short confirmation.

## Setup

### 1. Pair the watch

In the Soul Organizer web app:

- Go to **Settings → Wear OS**.
- Tap **Pair new watch**.
- Give the watch a name (e.g. "My Galaxy Watch").
- Copy the generated pairing code.

On the watch:

- Open the **Soul Voice** app.
- Tap **Pairing**.
- Paste the pairing code and tap **Pair watch**.

The base URL is already set to your published app (`https://soul-organizer-pro.lovable.app`). If you ever republish under a different domain, update the URL in the watch pairing screen.

### 2. Build and install

You need Android Studio (Ladybug or newer).

```bash
cd wear-os/SoulWatch
./gradlew installDebug
```

Or open the `wear-os/SoulWatch` folder in Android Studio and click **Run**.

## Permissions

The app asks for microphone permission on first use. It does not need location or contacts.

## Troubleshooting

- **"Not paired"** — generate a new pairing code in Settings and re-enter it on the watch.
- **Could not send** — check that the watch is connected to Wi-Fi / Bluetooth internet and that the published app is live.
- **Wrong language** — the watch uses the watch system language (`he` for Hebrew, otherwise `en`).

## Files worth knowing

- `app/src/main/java/com/soulorganizer/watch/MainActivity.kt` — recording UI and tap flow.
- `app/src/main/java/com/soulorganizer/watch/PairingActivity.kt` — enter pairing code.
- `app/src/main/java/com/soulorganizer/watch/SoulApi.kt` — HTTP client and token storage.
- `app/src/main/java/com/soulorganizer/watch/VoiceRecorder.kt` — MediaRecorder wrapper.
- `src/routes/api/public/wear/voice.ts` (web app) — the server endpoint that receives the audio.
