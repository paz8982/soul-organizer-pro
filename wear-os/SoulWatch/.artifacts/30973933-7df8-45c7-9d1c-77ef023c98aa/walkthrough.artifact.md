# Walkthrough - Gradle Plugin Resolution Fix

I have resolved the issue where the `com.android.application` plugin could not be found.

## Changes

### Build Configuration

#### [settings.gradle.kts](file:///C:/Git/Other/soul-organizer-pro/wear-os/SoulWatch/settings.gradle.kts)

Added `pluginManagement` and `dependencyResolutionManagement` blocks. These ensure that Gradle looks in the correct repositories (`google()` and `mavenCentral()`) for both build plugins and application dependencies.

## Verification Results

### Gradle Sync
The project sync was triggered and finished successfully.
