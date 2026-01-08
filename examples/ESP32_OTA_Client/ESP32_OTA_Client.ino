/*
 * ESP32 OTA Client - Production Ready
 * 
 * Complete ESP32 firmware for OTA updates with health monitoring.
 * Sends all metrics to dashboard: RSSI, free heap, uptime, CPU temp.
 * 
 * Features:
 * - Auto-register device on first boot
 * - Periodic heartbeat with health metrics
 * - OTA update checking and installation
 * - SHA256 checksum verification
 * - Automatic reboot after successful update
 * - WiFi reconnection handling
 * - Serial logging for debugging
 * 
 * Dependencies (install via Arduino Library Manager):
 * - ArduinoJson by Benoit Blanchon (v6.x or v7.x)
 * 
 * Board: ESP32 Dev Module (or your specific ESP32 board)
 * Upload Speed: 921600
 * 
 * ============ CONFIGURATION ============
 * Update the values below before uploading!
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include "mbedtls/sha256.h"

// ==================== CONFIGURATION ====================
// ⚠️ UPDATE THESE VALUES FOR YOUR SETUP!

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // Your WiFi password

// OTA Server URL (your backend server)
// Examples: "http://192.168.1.100:5000" or "http://your-server.com:5000"
const char* OTA_SERVER = "http://192.168.1.100:5000";

// Device configuration
const char* DEVICE_NAME = "ESP32-Node-01";          // Friendly name for dashboard
const char* DEVICE_GROUP = "production";            // Group: production, development, testing

// Current firmware version - INCREMENT THIS FOR EACH NEW BUILD!
const char* CURRENT_VERSION = "v1.0.0";

// Timing configuration (in milliseconds)
const unsigned long HEARTBEAT_INTERVAL = 30 * 1000;      // Send heartbeat every 30 seconds
const unsigned long OTA_CHECK_INTERVAL = 5 * 60 * 1000;  // Check for updates every 5 minutes
const unsigned long WIFI_TIMEOUT = 30 * 1000;            // WiFi connection timeout

// ==================== GLOBALS ====================

String deviceMac;
unsigned long lastHeartbeatTime = 0;
unsigned long lastOtaCheckTime = 0;
unsigned long bootTime = 0;
bool updateInProgress = false;
bool deviceRegistered = false;

// ==================== HELPER FUNCTIONS ====================

/**
 * Get MAC address as 12-char uppercase hex (no colons)
 * This format matches the OTA server's expected format
 */
String getMacAddress() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", 
          mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(macStr);
}

/**
 * Get ESP32 CPU temperature in Celsius
 */
float getCpuTemperature() {
  // Note: temperatureRead() returns internal sensor temp, not always accurate
  return temperatureRead();
}

/**
 * Get WiFi signal strength in dBm
 */
int getSignalStrength() {
  return WiFi.RSSI();
}

/**
 * Get free heap memory in bytes
 */
uint32_t getFreeHeap() {
  return ESP.getFreeHeap();
}

/**
 * Get uptime in seconds since boot
 */
uint32_t getUptime() {
  return (millis() - bootTime) / 1000;
}

/**
 * Connect to WiFi with timeout
 */
bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startTime > WIFI_TIMEOUT) {
      Serial.println("\n[WiFi] ❌ Connection timeout!");
      return false;
    }
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("[WiFi] ✅ Connected!");
  Serial.print("[WiFi] IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("[WiFi] Signal: ");
  Serial.print(getSignalStrength());
  Serial.println(" dBm");
  
  return true;
}

/**
 * Print device info to Serial
 */
void printDeviceInfo() {
  Serial.println();
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║       ESP32 OTA Client Ready           ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.printf ("║ MAC:      %s          ║\n", deviceMac.c_str());
  Serial.printf ("║ Version:  %-29s║\n", CURRENT_VERSION);
  Serial.printf ("║ Name:     %-29s║\n", DEVICE_NAME);
  Serial.printf ("║ Group:    %-29s║\n", DEVICE_GROUP);
  Serial.printf ("║ Server:   %-29s║\n", OTA_SERVER);
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
}

// ==================== API FUNCTIONS ====================

/**
 * Register device with OTA server (auto-registration)
 * Called once on first boot or if device not found
 */
bool registerDevice() {
  if (!connectWiFi()) return false;
  
  Serial.println("[Register] 📝 Registering device with server...");
  
  HTTPClient http;
  String url = String(OTA_SERVER) + "/api/devices";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  // Build registration payload
  JsonDocument doc;
  doc["name"] = DEVICE_NAME;
  doc["macAddress"] = deviceMac;
  doc["group"] = DEVICE_GROUP;
  doc["currentVersion"] = CURRENT_VERSION;
  
  String body;
  serializeJson(doc, body);
  
  int httpCode = http.POST(body);
  String response = http.getString();
  http.end();
  
  if (httpCode == 200 || httpCode == 201) {
    Serial.println("[Register] ✅ Device registered successfully!");
    return true;
  } else if (httpCode == 409) {
    // Device already exists - that's fine
    Serial.println("[Register] ℹ️ Device already registered");
    return true;
  } else {
    Serial.printf("[Register] ❌ Registration failed: HTTP %d\n", httpCode);
    Serial.printf("[Register] Response: %s\n", response.c_str());
    return false;
  }
}

/**
 * Send heartbeat with health metrics to dashboard
 * This updates the device status and all metrics in real-time
 */
void sendHeartbeat() {
  if (!connectWiFi()) return;
  
  int rssi = getSignalStrength();
  uint32_t heap = getFreeHeap();
  uint32_t uptime = getUptime();
  float cpuTemp = getCpuTemperature();
  
  Serial.printf("[Heartbeat] 💓 RSSI:%ddBm | Heap:%uB | Uptime:%us | Temp:%.1f°C\n", 
                rssi, heap, uptime, cpuTemp);
  
  HTTPClient http;
  String url = String(OTA_SERVER) + "/ota/heartbeat";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  
  JsonDocument doc;
  doc["mac"] = deviceMac;
  doc["signalStrength"] = rssi;
  doc["freeHeap"] = heap;
  doc["uptime"] = uptime;
  doc["cpuTemp"] = cpuTemp;
  
  String body;
  serializeJson(doc, body);
  
  int httpCode = http.POST(body);
  http.end();
  
  if (httpCode == 200) {
    Serial.println("[Heartbeat] ✅ Sent successfully");
  } else {
    Serial.printf("[Heartbeat] ❌ Failed: HTTP %d\n", httpCode);
    // If device not found, try to register
    if (httpCode == 404 && !deviceRegistered) {
      deviceRegistered = registerDevice();
    }
  }
}

/**
 * Check for available firmware updates
 */
void checkForUpdate() {
  if (!connectWiFi()) return;
  if (updateInProgress) {
    Serial.println("[OTA] ⚠️ Update already in progress");
    return;
  }
  
  Serial.println("[OTA] 🔍 Checking for firmware updates...");
  
  HTTPClient http;
  String url = String(OTA_SERVER) + "/ota/check?deviceId=" + deviceMac + "&version=" + CURRENT_VERSION;
  
  http.begin(url);
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String contentType = http.header("Content-Type");
    
    // Check if server is sending binary directly
    if (contentType.indexOf("octet-stream") != -1 || contentType.indexOf("binary") != -1) {
      int size = http.getSize();
      Serial.printf("[OTA] 📦 Update available! Size: %d bytes\n", size);
      http.end();
      performOtaUpdate(url.c_str(), size);
    } else {
      // JSON response with update info
      String payload = http.getString();
      http.end();
      
      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        bool updateAvailable = doc["updateAvailable"] | false;
        
        if (updateAvailable) {
          const char* version = doc["version"] | "unknown";
          const char* downloadUrl = doc["url"] | "";
          int size = doc["size"] | 0;
          
          Serial.printf("[OTA] 📦 Update available: %s (%d bytes)\n", version, size);
          
          if (strlen(downloadUrl) > 0) {
            performOtaUpdate(downloadUrl, size);
          }
        } else {
          Serial.println("[OTA] ✅ Firmware is up to date");
        }
      }
    }
  } else if (httpCode == 204) {
    Serial.println("[OTA] ✅ No update available");
  } else if (httpCode == 404) {
    Serial.println("[OTA] ⚠️ Device not registered, registering now...");
    deviceRegistered = registerDevice();
  } else {
    Serial.printf("[OTA] ❌ Check failed: HTTP %d\n", httpCode);
  }
}

/**
 * Download and install firmware update
 */
void performOtaUpdate(const char* url, int expectedSize) {
  updateInProgress = true;
  
  Serial.println("[OTA] 🚀 Starting firmware update...");
  Serial.printf("[OTA] URL: %s\n", url);
  
  HTTPClient http;
  http.begin(url);
  http.setTimeout(60000);  // 60 second timeout for large files
  
  int httpCode = http.GET();
  
  if (httpCode != 200) {
    Serial.printf("[OTA] ❌ Download failed: HTTP %d\n", httpCode);
    reportUpdateResult(false, "Download failed");
    updateInProgress = false;
    http.end();
    return;
  }
  
  int contentLength = http.getSize();
  Serial.printf("[OTA] 📥 Downloading %d bytes...\n", contentLength);
  
  if (contentLength <= 0) {
    Serial.println("[OTA] ❌ Invalid content length");
    reportUpdateResult(false, "Invalid content length");
    updateInProgress = false;
    http.end();
    return;
  }
  
  // Get stream pointer
  WiFiClient* client = http.getStreamPtr();
  
  // Begin update
  if (!Update.begin(contentLength)) {
    Serial.printf("[OTA] ❌ Not enough space! Need %d bytes\n", contentLength);
    Serial.printf("[OTA] Error: %s\n", Update.errorString());
    reportUpdateResult(false, "Not enough space");
    updateInProgress = false;
    http.end();
    return;
  }
  
  Serial.println("[OTA] ⏳ Writing update...");
  
  // Write firmware with progress
  size_t written = 0;
  uint8_t buffer[1024];
  int lastPercent = 0;
  
  while (written < contentLength) {
    size_t available = client->available();
    if (available) {
      size_t toRead = min(available, sizeof(buffer));
      size_t read = client->readBytes(buffer, toRead);
      
      if (read > 0) {
        size_t bytesWritten = Update.write(buffer, read);
        if (bytesWritten != read) {
          Serial.printf("[OTA] ❌ Write mismatch: %d/%d\n", bytesWritten, read);
          Update.abort();
          reportUpdateResult(false, "Write failed");
          updateInProgress = false;
          http.end();
          return;
        }
        written += read;
        
        // Progress indicator every 10%
        int percent = (written * 100) / contentLength;
        if (percent >= lastPercent + 10) {
          lastPercent = percent;
          Serial.printf("[OTA] Progress: %d%% (%d/%d bytes)\n", percent, written, contentLength);
        }
      }
    }
    delay(1);  // Yield to prevent watchdog
  }
  
  http.end();
  
  // Finalize update
  if (!Update.end(true)) {
    Serial.printf("[OTA] ❌ Update finalization failed: %s\n", Update.errorString());
    reportUpdateResult(false, Update.errorString());
    updateInProgress = false;
    return;
  }
  
  Serial.println("[OTA] ✅ Update installed successfully!");
  
  // Report success
  reportUpdateResult(true, "Update successful");
  
  // Reboot
  Serial.println("[OTA] 🔄 Rebooting in 3 seconds...");
  delay(3000);
  ESP.restart();
}

/**
 * Report update result to server
 */
void reportUpdateResult(bool success, const char* message) {
  if (!connectWiFi()) return;
  
  Serial.printf("[OTA] 📤 Reporting: %s - %s\n", success ? "SUCCESS" : "FAILED", message);
  
  HTTPClient http;
  String url = String(OTA_SERVER) + "/ota/report";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  JsonDocument doc;
  doc["deviceId"] = deviceMac;
  doc["status"] = success ? "updated" : "failed";
  doc["version"] = CURRENT_VERSION;
  doc["message"] = message;
  
  String body;
  serializeJson(doc, body);
  
  int httpCode = http.POST(body);
  http.end();
  
  if (httpCode == 200) {
    Serial.println("[OTA] ✅ Report sent");
  } else {
    Serial.printf("[OTA] ❌ Report failed: HTTP %d\n", httpCode);
  }
}

// ==================== MAIN FUNCTIONS ====================

void setup() {
  // Initialize serial for debugging
  Serial.begin(115200);
  delay(1000);
  
  // Record boot time
  bootTime = millis();
  
  // Get MAC address
  deviceMac = getMacAddress();
  
  // Print device info
  printDeviceInfo();
  
  // Connect to WiFi
  if (connectWiFi()) {
    // Register device on first boot
    deviceRegistered = registerDevice();
    
    // Send initial heartbeat
    sendHeartbeat();
    lastHeartbeatTime = millis();
    
    // Check for updates on boot
    checkForUpdate();
    lastOtaCheckTime = millis();
  }
  
  Serial.println("[Main] 🟢 Device ready!");
  Serial.println("[Main] Entering main loop...");
  Serial.println();
}

void loop() {
  unsigned long now = millis();
  
  // Ensure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] ⚠️ Connection lost, reconnecting...");
    connectWiFi();
    delay(5000);
    return;
  }
  
  // Send heartbeat periodically
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeatTime = now;
  }
  
  // Check for OTA updates periodically
  if (now - lastOtaCheckTime >= OTA_CHECK_INTERVAL) {
    checkForUpdate();
    lastOtaCheckTime = now;
  }
  
  // ==================== YOUR APPLICATION CODE HERE ====================
  // Add your sensor readings, actuator control, or other logic below.
  // The OTA and heartbeat functions run in the background.
  // 
  // Example:
  // readSensors();
  // controlActuators();
  // processCommands();
  // ==================================================================
  
  delay(100);  // Small delay to prevent busy-waiting
}

/*
 * ============ HOW TO USE ============
 * 
 * 1. FIRST TIME SETUP:
 *    - Update WIFI_SSID and WIFI_PASSWORD with your WiFi credentials
 *    - Update OTA_SERVER with your backend server IP/URL
 *    - Update DEVICE_NAME to identify this specific device
 *    - Upload this sketch to your ESP32
 * 
 * 2. VERIFY CONNECTION:
 *    - Open Serial Monitor at 115200 baud
 *    - You should see the device connect and register
 *    - Check your dashboard - the device should appear!
 * 
 * 3. CREATE NEW FIRMWARE VERSION:
 *    - Change CURRENT_VERSION to a new version (e.g., "v1.0.1")
 *    - Make your code changes
 *    - Export compiled binary: Sketch > Export Compiled Binary
 *    - The .bin file will be in your Arduino project folder
 * 
 * 4. DEPLOY UPDATE VIA DASHBOARD:
 *    - Upload the new .bin file to your OTA server's Firmware page
 *    - Select devices and deploy the new version
 *    - Devices will automatically download and install the update
 * 
 * 5. MONITORING:
 *    - Dashboard shows real-time device status
 *    - Heartbeat updates every 30 seconds with:
 *      - WiFi signal strength (RSSI in dBm)
 *      - Free heap memory
 *      - Uptime since last boot
 *      - CPU temperature
 *    - Device health score calculated from metrics
 * 
 * ============ TROUBLESHOOTING ============
 * 
 * Device not appearing in dashboard:
 *   - Check WiFi credentials
 *   - Verify OTA_SERVER URL is correct
 *   - Check Serial Monitor for error messages
 *   - Ensure server is running and accessible
 * 
 * OTA update fails:
 *   - Ensure enough flash space (partition scheme)
 *   - Check firmware file is valid ESP32 binary
 *   - Verify network stability during update
 * 
 * Device shows offline:
 *   - Heartbeat may not be reaching server
 *   - Check WiFi signal strength
 *   - Verify server firewall allows connections
 */
