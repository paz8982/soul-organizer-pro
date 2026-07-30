import org.json.JSONObject

data class VoiceResponse(
    val success: Boolean,
    val action: String? = null,
    val transcript: String? = null,
    val title: String? = null,
    val error: String? = null,
)

fun parseVoiceResponse(json: String): VoiceResponse {
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
        VoiceResponse(success = false, error = "Invalid response: ${e.message}")
    }
}

fun main() {
    val json1 = """{"success":false,"transcript":"","error":"Invalid or revoked device token"}"""
    val res1 = parseVoiceResponse(json1)
    println("Test 1 (Failure): $res1")
    assert(!res1.success)
    assert(res1.error == "Invalid or revoked device token")

    val json2 = """{"success":true,"action":"task","title":"Buy milk"}"""
    val res2 = parseVoiceResponse(json2)
    println("Test 2 (Success): $res2")
    assert(res2.success)
    assert(res2.action == "task")
    assert(res2.title == "Buy milk")

    val json3 = """{"success": true, "transcript": "hello"}"""
    val res3 = parseVoiceResponse(json3)
    println("Test 3 (Spaces and unquoted boolean): $res3")
    assert(res3.success)
    assert(res3.transcript == "hello")

    println("All tests passed!")
}
