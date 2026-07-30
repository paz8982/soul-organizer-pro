package com.soulorganizer.watch

import android.os.Bundle
import android.text.InputFilter
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.fragment.app.FragmentActivity

class PairingActivity : FragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pairing)

        val tokenInput = findViewById<EditText>(R.id.tokenInput)
        val urlInput = findViewById<EditText>(R.id.urlInput)
        val pairButton = findViewById<Button>(R.id.pairButton)

        urlInput.setText(SoulApi.getBaseUrl())
        tokenInput.filters = arrayOf(
            InputFilter.LengthFilter(6),
            InputFilter.AllCaps(),
            InputFilter { source, _, _, _, _, _ ->
                source.filter { it.isLetter() }
            },
        )

        pairButton.setOnClickListener {
            val code = tokenInput.text.toString().trim().uppercase()
            val url = urlInput.text.toString().trim().ifBlank { SoulApi.getBaseUrl() }
            if (code.length != 6) {
                Toast.makeText(this, R.string.pairing_failed, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            pairButton.isEnabled = false
            SoulApi.pairWithCode(code, url) { success, error ->
                runOnUiThread {
                    pairButton.isEnabled = true
                    if (success) {
                        Toast.makeText(this, R.string.paired, Toast.LENGTH_SHORT).show()
                        finish()
                    } else {
                        Toast.makeText(
                            this,
                            error ?: getString(R.string.pairing_failed),
                            Toast.LENGTH_LONG,
                        ).show()
                    }
                }
            }
        }
    }
}
