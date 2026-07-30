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
        
        val langAuto = findViewById<Button>(R.id.langAutoButton)
        val langEn = findViewById<Button>(R.id.langEnButton)
        val langHe = findViewById<Button>(R.id.langHeButton)

        urlInput.setText(SoulApi.getBaseUrl())
        
        fun updateLangUi(selected: String) {
            langAuto.alpha = if (selected == "auto") 1.0f else 0.5f
            langEn.alpha = if (selected == "en") 1.0f else 0.5f
            langHe.alpha = if (selected == "he") 1.0f else 0.5f
        }

        updateLangUi(SoulApi.getLanguage())

        langAuto.setOnClickListener {
            SoulApi.setLanguage("auto")
            updateLangUi("auto")
        }
        langEn.setOnClickListener {
            SoulApi.setLanguage("en")
            updateLangUi("en")
        }
        langHe.setOnClickListener {
            SoulApi.setLanguage("he")
            updateLangUi("he")
        }

        tokenInput.filters = arrayOf(
            InputFilter.LengthFilter(6),
            InputFilter.AllCaps(),
        )

        fun validate(): Pair<String, String>? {
            val token = tokenInput.text.toString().trim()
            val url = urlInput.text.toString().trim()
            if (token.isEmpty()) {
                Toast.makeText(this, R.string.token_required, Toast.LENGTH_SHORT).show()
                return null
            }
            if (token.length != 6) {
                Toast.makeText(this, R.string.pairing_failed, Toast.LENGTH_SHORT).show()
                return null
            }
            if (token.contains(" ")) {
                Toast.makeText(this, R.string.no_spaces, Toast.LENGTH_SHORT).show()
                return null
            }
            if (url.isEmpty()) {
                Toast.makeText(this, R.string.url_required, Toast.LENGTH_SHORT).show()
                return null
            }
            return Pair(token, url)
        }

        pairButton.setOnClickListener {
            val (token, url) = validate() ?: return@setOnClickListener
            pairButton.isEnabled = false
            SoulApi.pairWithCode(token, url) { success, error ->
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
