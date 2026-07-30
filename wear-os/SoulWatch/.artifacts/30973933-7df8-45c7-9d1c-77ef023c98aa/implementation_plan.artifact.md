# Fix Gradle Plugin Resolution Issue

The current project is failing to sync because it cannot find the `com.android.application` plugin. This is because the `google()` repository, where Android Gradle plugins are hosted, is not configured in the plugin management settings.

## Proposed Changes

### Build Configuration

#### [MODIFY] [settings.gradle.kts](file:///C:/Git/Other/soul-organizer-pro/wear-os/SoulWatch/settings.gradle.kts)

Add `pluginManagement` and `dependencyResolutionManagement` blocks to configure the necessary repositories (`google()` and `mavenCentral()`) for both plugins and project dependencies.

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "SoulWatch"
include(":app")
```

## Verification Plan

### Automated Tests
- Run `gradle_sync` to verify that the project syncs successfully and the plugin is resolved.
