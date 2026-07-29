package com.soulorganizer.watch

import android.app.Application

class SoulWatchApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SoulApi.initialize(this)
    }
}
