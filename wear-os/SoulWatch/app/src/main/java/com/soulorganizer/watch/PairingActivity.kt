package com.soulorganizer.watch

import android.os.Bundle
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

        pairButton.setOnClickListener {
            val token = tokenInput.text.toString().trim()
            val url = urlInput.text.toString().trim()
            if (token.length < 16) {
                Toast.makeText(this, R.string.pairing_failed, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            SoulApi.setToken(token)
            if (url.isNotBlank()) SoulApi.setBaseUrl(url)
            Toast.makeText(this, R.string.paired, Toast.LENGTH_SHORT).show()
            finish()
        }
    }
}
