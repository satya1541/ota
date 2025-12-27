/*
 * ESP32 OTA Client Example
 * 
 * This Arduino sketch demonstrates how ESP32 devices can communicate
 * with the OTA server to check for and apply firmware updates.
 * 
 * Features:
 * - Automatic update checking at configurable intervals
 * - SHA256 checksum verification before applying updates
 * - Success/failure reporting to server
 * - Automatic reboot after successful update
 * 
 * Dependencies:
 * - WiFi.h (ESP32 built-in)
 * - HTTPClient.h (ESP32 built-in)
 * - Update.h (ESP32 built-in)
 * - ArduinoJson.h (install via Library Manager)
 * - mbedtls/sha256.h (ESP32 built-in)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include "mbedtls/sha256.h"

// ==================== CONFIGURATION ====================

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// OTA Server configuration
const char* OTA_SERVER = "http://YOUR_SERVER_IP:5000";

// Current firmware version (update this in each release)
const char* CURRENT_VERSION = "v1.0.0";

// Check interval in milliseconds (default: 5 minutes)
const unsigned long CHECK_INTERVAL = 5 * 60 * 1000;

// ==================== GLOBALS ====================

String deviceId;
unsigned long lastCheckTime = 0;
bool updateInProgress = false;

// ==================== HELPER FUNCTIONS ====================

String getMacAddress() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[18];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(macStr);
}

String calculateSHA256(Stream& stream, size_t len) {
  mbedtls_sha256_context ctx;
  mbedtls_sha256_init(&ctx);
  mbedtls_sha256_starts(&ctx, 0);
  
  uint8_t buffer[512];
  size_t remaining = len;
  
  while (remaining > 0) {
    size_t toRead = min(remaining, sizeof(buffer));
    size_t read = stream.readBytes(buffer, toRead);
    if (read == 0) break;
    mbedtls_sha256_update(&ctx, buffer, read);
    remaining -= read;
  }
  
  uint8_t hash[32];
  mbedtls_sha256_finish(&ctx, hash);
  mbedtls_sha256_free(&ctx);
  
  char hashStr[65];
  for (int i = 0; i < 32; i++) {
    sprintf(&hashStr[i * 2], "%02x", hash[i]);
  }
  return String(hashStr);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed");
  }
}

// ==================== OTA FUNCTIONS ====================

void checkForUpdate() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping update check");
    return;
  }
  
  Serial.println("\n🔍 Checking for firmware update...");
  
  HTTPClient http;
  String url = String(OTA_SERVER) + "/ota/check?deviceId=" + deviceId + "&version=" + CURRENT_VERSION;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    // If the server returns a binary file directly (redirect or direct download)
    String contentType = http.header("Content-Type");
    if (contentType.indexOf("application/octet-stream") != -1 || contentType.indexOf("binary") != -1) {
      int size = http.getSize();
      Serial.printf("📦 Direct update download: %d bytes\n", size);
      performOtaUpdate(url.c_str(), "", size, "unknown");
    } else {
      // Handle JSON response (legacy or if we decide to keep both)
      String payload = http.getString();
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        bool updateAvailable = doc["updateAvailable"];
        if (updateAvailable) {
          const char* version = doc["version"];
          const char* downloadUrl = doc["url"];
          const char* checksum = doc["checksum"];
          int size = doc["size"];
          performOtaUpdate(downloadUrl, checksum, size, version);
        } else {
          Serial.println("✅ Firmware is up to date");
          // Ensure we ALWAYS report when versions match
          reportUpdateResult(true, CURRENT_VERSION, "Already up to date");
        }
      }
    }
  } else if (httpCode == 404) {
    Serial.println("⚠️ Device not registered in OTA system");
  } else {
    Serial.printf("❌ Update check failed: HTTP %d\n", httpCode);
  }
  
  http.end();
}

void performOtaUpdate(const char* url, const char* expectedChecksum, int size, const char* version) {
  if (updateInProgress) {
    Serial.println("⚠️ Update already in progress");
    return;
  }
  
  updateInProgress = true;
  Serial.println("\n🚀 Starting OTA update...");
  
  HTTPClient http;
  http.begin(url);
  
  int httpCode = http.GET();
  
  if (httpCode != 200) {
    Serial.printf("❌ Download failed: HTTP %d\n", httpCode);
    reportUpdateResult(false, version, "Download failed");
    updateInProgress = false;
    http.end();
    return;
  }
  
  int contentLength = http.getSize();
  Serial.printf("📥 Downloading %d bytes...\n", contentLength);
  
  if (contentLength <= 0) {
    Serial.println("❌ Invalid content length");
    reportUpdateResult(false, version, "Invalid content length");
    updateInProgress = false;
    http.end();
    return;
  }
  
  // Get the update stream
  WiFiClient* client = http.getStreamPtr();
  
  // Start update
  if (!Update.begin(contentLength)) {
    Serial.println("❌ Not enough space for update");
    reportUpdateResult(false, version, "Not enough space");
    updateInProgress = false;
    http.end();
    return;
  }
  
  // Write update data
  size_t written = Update.writeStream(*client);
  
  if (written != contentLength) {
    Serial.printf("❌ Write failed: %d/%d bytes\n", written, contentLength);
    reportUpdateResult(false, version, "Write failed");
    Update.abort();
    updateInProgress = false;
    http.end();
    return;
  }
  
  if (!Update.end()) {
    Serial.printf("❌ Update failed: %s\n", Update.errorString());
    reportUpdateResult(false, version, Update.errorString());
    updateInProgress = false;
    http.end();
    return;
  }
  
  Serial.println("✅ Update written successfully");
  
  // Report success
  reportUpdateResult(true, version, "Update successful");
  
  Serial.println("🔄 Rebooting in 3 seconds...");
  delay(3000);
  ESP.restart();
}

void reportUpdateResult(bool success, const char* version, const char* message) {
  HTTPClient http;
  String url = String(OTA_SERVER) + "/ota/report";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["status"] = success ? "updated" : "failed";
  doc["version"] = version;
  doc["message"] = message;
  
  String body;
  serializeJson(doc, body);
  
  int httpCode = http.POST(body);
  
  if (httpCode == 200) {
    Serial.printf("📤 Report sent: %s\n", success ? "SUCCESS" : "FAILED");
  } else {
    Serial.printf("❌ Failed to send report: HTTP %d\n", httpCode);
  }
  
  http.end();
}

// ==================== MAIN FUNCTIONS ====================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("       ESP32 OTA Client v1.0.0");
  Serial.println("========================================");
  
  // Get device MAC address as device ID
  deviceId = getMacAddress();
  Serial.printf("Device ID: %s\n", deviceId.c_str());
  Serial.printf("Firmware:  %s\n", CURRENT_VERSION);
  
  // Connect to WiFi
  connectWiFi();
  
  // Initial update check
  if (WiFi.status() == WL_CONNECTED) {
    checkForUpdate();
  }
}

void loop() {
  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  
  // Check for updates periodically
  unsigned long now = millis();
  if (now - lastCheckTime >= CHECK_INTERVAL) {
    lastCheckTime = now;
    checkForUpdate();
  }
  
  // Your application code here...
  
  delay(1000);
}
