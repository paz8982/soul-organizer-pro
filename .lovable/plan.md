# 6-Character Watch Pairing Code

Today the app shows a 64-character device token that must be typed on the watch. Instead, the app will show a short **6-character code** (uppercase letters/digits, e.g. `K7Q2MB`), valid for 10 minutes and single-use. The watch types the short code once, exchanges it behind the scenes for the real long token, and stores that token permanently. Security stays the same because the long secret never has to be typed.

## Flow

```text
App (Settings → Wear OS)        Watch                        Server
  "Pair new watch"  ──────────────────────────────► create device + long token
        shows  K7Q2MB                                  + 6-char code (10 min, one use)
                              type K7Q2MB ──────────► verify code
                              store long token ◄────── return long token, burn code
                              record voice  ─────────► X-Wear-Token: <long token>
```

## Changes

**Database (migration)**
- Add `pairing_code` (text), `pairing_code_expires_at` (timestamptz) to `wear_devices`, with a unique index on active codes.

**Server**
- `createWearDevice` also generates a 6-character code (ambiguity-free alphabet, no 0/O/1/I) and returns it instead of the raw token.
- New public endpoint `POST /api/public/wear/pair`: takes `{ code }`, validates it's unpaired and unexpired, returns the long device token, and clears the code so it can't be reused.

**Web UI (Settings → Wear OS pairing dialog)**
- Display the short code in large monospace type with a copy button and a "valid for 10 minutes" note, in Hebrew and English.

**Wear OS app**
- Pairing screen accepts 6 characters (auto-uppercase, `maxLength=6`), calls `/api/public/wear/pair`, saves the returned token, and shows a clear error for invalid/expired codes.
- README updated to describe the short code.

Existing paired watches keep working — their stored tokens are untouched.
