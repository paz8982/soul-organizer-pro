# Implementation Plan - Debug Session Expiration and Improve Pairing Flow

The user reports that the app consistently shows "Session expired" after recording. This indicates that the backend is rejecting the `X-Wear-Token`. While the error handling I added is working (it catches the error), we need to help the user troubleshoot why the token is being rejected.

## Research Findings
- The backend (`voice.ts`) hashes the token using SHA-256 and checks it against the `wear_devices` table.
- The token is expected to be a 64-character hex string (generated from 32 random bytes).
- The backend returns "Invalid or revoked device token" if the hash doesn't match or the device is disabled.
- The "Session expired" message in the app is triggered by this server response.

## Proposed Changes

### [Core API]
#### [MODIFY] [SoulApi.kt](file:///C:/Git/Other/soul-organizer-pro/wear-os/SoulWatch/app/src/main/java/com/soulorganizer/watch/SoulApi.kt)
- Add a `testConnection` function that sends a request to the server to verify the token without requiring an audio recording.
- Normalize the Base URL in `setBaseUrl` (remove trailing slashes) to prevent URL construction errors.
- Add logging to track token length and URL to help debug pairing issues in Logcat.

### [UI / UX]
#### [MODIFY] [PairingActivity.kt](file:///C:/Git/Other/soul-organizer-pro/wear-os/SoulWatch/app/src/main/java/com/soulorganizer/watch/PairingActivity.kt)
- Add validation for the pairing code (ensure it's not obviously wrong, like having spaces or being the wrong length).
- Implement a "Test Connection" button that uses the new `testConnection` API to provide immediate feedback to the user.
- Show a clearer error if the connection test fails (distinguishing between "Invalid Code" and "Connection Error").

#### [MODIFY] [MainActivity.kt](file:///C:/Git/Other/soul-organizer-pro/wear-os/SoulWatch/app/src/main/java/com/soulorganizer/watch/MainActivity.kt)
- Update the "Session expired" message to suggest checking if the device is enabled in the web app.

## Verification Plan

### Manual Verification
- Deploy the app and test with a purposely invalid token to verify the "Test Connection" failure.
- Verify that trailing slashes in the URL are correctly handled.
- Verify that the new feedback in `PairingActivity` helps identify why a token might be rejected.
