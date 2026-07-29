package com.soulorganizer.watch

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

class MainActivity : FragmentActivity() {

    private lateinit var recorder: VoiceRecorder
    private lateinit var statusText: TextView
    private lateinit var resultText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var micIcon: ImageView
    private var isRecording = false

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            startRecording()
        } else {
            showError("Microphone permission required")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        recorder = VoiceRecorder(this)
        statusText = findViewById(R.id.statusText)
        resultText = findViewById(R.id.resultText)
        progressBar = findViewById(R.id.progressBar)
        micIcon = findViewById(R.id.micIcon)

        findViewById<View>(R.id.recordButton).setOnClickListener {
            if (isRecording) {
                stopRecording()
            } else {
                if (!SoulApi.isPaired()) {
                    openPairing()
                    return@setOnClickListener
                }
                if (recorder.hasPermission()) {
                    startRecording()
                } else {
                    permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
        }

        findViewById<View>(R.id.settingsButton).setOnClickListener {
            openPairing()
        }

        updateUi()
    }

    override fun onResume() {
        super.onResume()
        updateUi()
    }

    private fun updateUi() {
        if (SoulApi.isPaired()) {
            statusText.text = getString(R.string.tap_to_record)
        } else {
            statusText.text = getString(R.string.open_phone)
        }
    }

    private fun openPairing() {
        startActivity(Intent(this, PairingActivity::class.java))
    }

    private fun startRecording() {
        try {
            recorder.start()
            isRecording = true
            statusText.text = getString(R.string.recording)
            resultText.visibility = View.GONE
            progressBar.visibility = View.GONE
            micIcon.setImageResource(android.R.drawable.ic_btn_speak_now)
            vibrate(50)
        } catch (e: Exception) {
            showError(e.message ?: "Recording failed")
        }
    }

    private fun stopRecording() {
        isRecording = false
        statusText.text = getString(R.string.processing)
        progressBar.visibility = View.VISIBLE
        micIcon.setImageResource(android.R.drawable.ic_lock_idle_low_battery)
        vibrate(30)

        val file = recorder.stop()
        if (file == null || file.length() < 1024) {
            showError(getString(R.string.error))
            return
        }

        val locale = if (resources.configuration.locales.get(0).language == "he") "he" else "en"
        SoulApi.sendVoiceRecording(file, locale) { response ->
            lifecycleScope.launch(Dispatchers.Main) {
                progressBar.visibility = View.GONE
                if (response.success) {
                    resultText.visibility = View.VISIBLE
                    val label = when (response.action) {
                        "task" -> "Task created"
                        "journal" -> "Journal saved"
                        "search_archive" -> "Saved to archive"
                        else -> "Done"
                    }
                    statusText.text = getString(R.string.done)
                    resultText.text = "${label}\n${response.title ?: response.transcript ?: ""}"
                } else {
                    showError(response.error ?: getString(R.string.error))
                }
            }
        }
    }

    private fun vibrate(ms: Long) {
        val vibrator = ContextCompat.getSystemService(this, Vibrator::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(ms)
        }
    }

    private fun showError(message: String) {
        statusText.text = getString(R.string.tap_to_record)
        progressBar.visibility = View.GONE
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}
