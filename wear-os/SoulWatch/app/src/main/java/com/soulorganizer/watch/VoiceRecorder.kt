package com.soulorganizer.watch

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException

class VoiceRecorder(private val context: Context) {

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    fun hasPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
    }

    @Suppress("DEPRECATION")
    fun start(): File {
        val file = File(context.cacheDir, "voice_${System.currentTimeMillis()}.m4a")
        outputFile = file
        val mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            MediaRecorder()
        }
        recorder = mediaRecorder
        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC)
        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        mediaRecorder.setAudioSamplingRate(16000)
        mediaRecorder.setAudioChannels(1)
        mediaRecorder.setOutputFile(file.absolutePath)
        mediaRecorder.prepare()
        mediaRecorder.start()
        return file
    }

    fun stop(): File? {
        try {
            recorder?.stop()
        } catch (e: RuntimeException) {
            // ignore
        } finally {
            recorder?.reset()
            recorder?.release()
            recorder = null
        }
        return outputFile
    }

    fun cancel() {
        try {
            recorder?.stop()
        } catch (e: RuntimeException) {
            // ignore
        } finally {
            recorder?.reset()
            recorder?.release()
            recorder = null
        }
        outputFile?.delete()
        outputFile = null
    }
}
