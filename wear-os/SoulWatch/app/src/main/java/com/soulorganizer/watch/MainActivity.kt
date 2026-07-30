package com.soulorganizer.watch

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.View
import android.widget.Button
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
    private lateinit var recordButton: Button
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
        recordButton = findViewById(R.id.recordButton)

        recordButton.setOnClickListener {
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
        if (!isRecording) {
            recordButton.isEnabled = true
            recordButton.setText(R.string.tap_to_record)
            recordButton.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#333333"))
            if (SoulApi.isPaired()) {
                statusText.text = ""
            } else {
                statusText.text = getString(R.string.open_phone)
            }
        }
    }

    private fun openPairing() {
        startActivity(Intent(this, PairingActivity::class.java))
    }

    private fun startRecording() {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                recorder.start()
                launch(Dispatchers.Main) {
                    isRecording = true
                    recordButton.setText(R.string.stop_recording)
                    recordButton.backgroundTintList = ColorStateList.valueOf(
                        ContextCompat.getColor(this@MainActivity, android.R.color.holo_red_dark)
                    )
                    statusText.text = getString(R.string.recording)
                    resultText.visibility = View.GONE
                    progressBar.visibility = View.GONE
                    vibrate(50)
                }
            } catch (e: Exception) {
                launch(Dispatchers.Main) {
                    showError(e.message ?: "Recording failed")
                }
            }
        }
    }

    private fun stopRecording() {
        isRecording = false
        recordButton.isEnabled = false
        recordButton.setText(R.string.processing)
        recordButton.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#333333"))
        
        statusText.text = getString(R.string.processing)
        progressBar.visibility = View.VISIBLE
        vibrate(30)

        lifecycleScope.launch(Dispatchers.IO) {
            val file = recorder.stop()
            if (file == null || file.length() < 1024) {
                launch(Dispatchers.Main) {
                    showError(getString(R.string.error))
                }
                return@launch
            }

            val savedLang = SoulApi.getLanguage()
            val locale = if (savedLang == "auto") {
                val sysLang = resources.configuration.locales.get(0).language
                if (sysLang == "he" || sysLang == "iw") "he" else "en"
            } else {
                savedLang
            }

            SoulApi.sendVoiceRecording(file, locale) { response ->
                lifecycleScope.launch(Dispatchers.Main) {
                    recordButton.isEnabled = true
                    recordButton.setText(R.string.tap_to_record)
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
                        if (response.error?.contains("device token", ignoreCase = true) == true) {
                            SoulApi.clearToken()
                            showError(getString(R.string.session_expired))
                            openPairing()
                        } else {
                            showError(response.error ?: getString(R.string.error))
                        }
                    }
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
        isRecording = false
        recordButton.isEnabled = true
        recordButton.setText(R.string.tap_to_record)
        recordButton.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#333333"))
        statusText.text = ""
        progressBar.visibility = View.GONE
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}
