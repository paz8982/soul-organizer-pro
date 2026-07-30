package com.soulorganizer.watch

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import org.json.JSONObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.FormBody
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

object SoulApi {

    private const val PREFS_NAME = "soul_watch"
    private const val KEY_TOKEN = "token"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_LANGUAGE = "voice_language"

    private const val DEFAULT_BASE_URL = "https://soul-organizer-pro.lovable.app"

    private lateinit var prefs: SharedPreferences
    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY })
            .build()
    }

    fun initialize(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isPaired(): Boolean = getToken() != null

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun getBaseUrl(): String = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL

    fun setToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun setBaseUrl(url: String) {
        val normalizedUrl = url.trim().removeSuffix("/")
        prefs.edit().putString(KEY_BASE_URL, normalizedUrl).apply()
    }

    fun clearToken() {
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    fun getLanguage(): String = prefs.getString(KEY_LANGUAGE, "auto") ?: "auto"

    fun setLanguage(lang: String) {
        prefs.edit().putString(KEY_LANGUAGE, lang).apply()
    }

    /**
     * Exchanges a short 6-character pairing code for the long device token.
     * The long token is stored locally and used for every voice upload.
     */
    fun pairWithCode(code: String, baseUrl: String, onResult: (Boolean, String?) -> Unit) {
        val normalized = code.trim().uppercase()
        val url = "${baseUrl.trimEnd('/')}/api/public/wear/pair"
        val body = okhttp3.RequestBody.create(
            "application/json".toMediaTypeOrNull(),
            """{"code":"$normalized"}""",
        )
        val request = Request.Builder().url(url).post(body).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onResult(false, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                val json = response.body?.string() ?: "{}"
                val token = Regex(""""token"\s*:\s*"([^"]+)"""").find(json)?.groupValues?.get(1)
                if (response.isSuccessful && token != null) {
                    setBaseUrl(baseUrl.trimEnd('/'))
                    setToken(token)
                    onResult(true, null)
                } else {
                    val error = Regex(""""error"\s*:\s*"([^"]*)"""").find(json)?.groupValues?.get(1)
                    onResult(false, error ?: "Pairing failed")
                }
            }
        })
    }


    fun sendVoiceRecording(
        file: File,
        locale: String,
        onResult: (Result: VoiceResponse) -> Unit,
    ) {
        val token = getToken() ?: return onResult(VoiceResponse(success = false, error = "Not paired"))
        val baseUrl = getBaseUrl()
        val url = "$baseUrl/api/public/wear/voice"

        android.util.Log.d("SoulApi", "Sending recording to $url (token length: ${token.length}, language: $locale)")

        val mimeType = "audio/mp4"
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("locale", locale)
            .addFormDataPart("language", locale)
            .addFormDataPart("language_code", locale)
            .addFormDataPart(
                "audio",
                file.name,
                okhttp3.RequestBody.create(mimeType.toMediaTypeOrNull(), file),
            )
            .build()

        val request = Request.Builder()
            .url(url)
            .header("X-Wear-Token", token)
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onResult(VoiceResponse(success = false, error = e.message))
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: "{}"
                onResult(parseVoiceResponse(body))
            }
        })
    }

    fun testConnection(
        token: String,
        baseUrl: String,
        onResult: (success: Boolean, error: String?) -> Unit,
    ) {
        val normalizedBaseUrl = baseUrl.trim().removeSuffix("/")
        val url = "$normalizedBaseUrl/api/public/wear/voice"
        
        android.util.Log.d("SoulApi", "Testing connection to $url")

        val request = Request.Builder()
            .url(url)
            .header("X-Wear-Token", token)
            .post(FormBody.Builder().build()) // Empty body to trigger 400 or 401
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onResult(false, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                val code = response.code
                val body = response.body?.string() ?: ""
                android.util.Log.d("SoulApi", "Test response code: $code, body: $body")
                
                when (code) {
                    200, 400 -> onResult(true, null) // 400 means "Missing audio", which implies token is valid
                    401 -> onResult(false, "Invalid token")
                    else -> onResult(false, "Server error: $code")
                }
            }
        })
    }

    data class VoiceResponse(
        val success: Boolean,
        val action: String? = null,
        val transcript: String? = null,
        val title: String? = null,
        val error: String? = null,
    )

    private fun parseVoiceResponse(json: String): VoiceResponse {
        return try {
            val obj = JSONObject(json)
            fun getStringOrNull(key: String): String? {
                return if (obj.isNull(key)) null else obj.optString(key).takeIf { it.isNotEmpty() || obj.has(key) }
            }
            VoiceResponse(
                success = obj.optBoolean("success", false),
                action = getStringOrNull("action"),
                transcript = getStringOrNull("transcript"),
                title = getStringOrNull("title"),
                error = getStringOrNull("error"),
            )
        } catch (e: Exception) {
            VoiceResponse(success = false, error = "Invalid response")
        }
    }
}
