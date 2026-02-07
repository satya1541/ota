#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <ArduinoJson.h> // Install via Library Manager: "ArduinoJson" by Benoit Blanchon
#include <WebSocketsClient.h> // Install via Library Manager: "WebSockets" by Markus Sattler

// =================CONFIGURATIONS=================

// 1. Wi-Fi Credentials
const char* SSID = "YOUR_WIFI_SSID";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";

// 2. Server Configuration
const char* SERVER_HOST = "ota.thynxai.cloud"; 
const int SERVER_PORT = 443;  
const bool USE_HTTPS = true;

// 3. Device Identity
String macAddress; 
String deviceName = "ESP32-Device";
const char* FIRMWARE_VERSION = "0.0.1"; 

// =================GLOBALS=================

WebSocketsClient webSocket;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds
unsigned long lastOtaCheck = 0;
const unsigned long OTA_CHECK_INTERVAL = 60000 * 60; // 1 hour
unsigned long lastCommandPoll = 0;
const unsigned long COMMAND_POLL_INTERVAL = 15000; // 15 seconds fallback

// =================HELPER FUNCTIONS=================

String getMacAddress() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  return mac;
}

// Function to read internal temperature (ESP32 specific)
float getInternalTemp() {
  // Built-in temp sensor is removed in newer ESP32 chips, but some still have it
  // Returns temperature in Fahrenheit by default in older chips
  #ifdef SOC_TEMP_SENSOR_SUPPORTED
    return (temprature_sens_read() - 32) / 1.8; // Convert to Celsius
  #else
    return 0.0;
  #endif
}

void reportOTAProgress(int progress, int bytesReceived, int totalBytes) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = "https://" + String(SERVER_HOST) + "/ota/progress";
  
  StaticJsonDocument<200> doc;
  doc["deviceId"] = macAddress;
  doc["progress"] = progress;
  doc["bytesReceived"] = bytesReceived;
  doc["totalBytes"] = totalBytes;

  String payload;
  serializeJson(doc, payload);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.POST(payload);
  http.end();
}

void reportOTAResult(String status, String message = "") {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = "https://" + String(SERVER_HOST) + "/ota/report";
  
  StaticJsonDocument<200> doc;
  doc["deviceId"] = macAddress;
  doc["status"] = status; // success, failed, updated
  doc["version"] = FIRMWARE_VERSION;
  if (message != "") doc["message"] = message;

  String payload;
  serializeJson(doc, payload);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.POST(payload);
  http.end();
}

void acknowledgeCommand(int commandId, String status, String response = "") {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = "https://" + String(SERVER_HOST) + "/ota/commands/" + String(commandId) + "/ack";
  
  StaticJsonDocument<200> doc;
  doc["status"] = status;
  if (response != "") doc["response"] = response;

  String payload;
  serializeJson(doc, payload);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.POST(payload);
  http.end();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  // Correct URL for heartbeat
  String url = "https://" + String(SERVER_HOST) + "/ota/heartbeat";
  
  StaticJsonDocument<256> doc;
  doc["mac"] = macAddress;
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["signalStrength"] = WiFi.RSSI();
  doc["cpuTemp"] = (int)(getInternalTemp() * 10); // Sent as integer Celsius * 10

  String payload;
  serializeJson(doc, payload);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    Serial.printf("[Heartbeat] Sent successfully, code: %d\n", httpResponseCode);
  } else {
    Serial.printf("[Heartbeat] Failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

void checkForUpdates() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.println("[OTA] Checking for updates...");
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  // Correct URL with query params
  String url = "https://" + String(SERVER_HOST) + "/ota/check?deviceId=" + macAddress + "&version=" + String(FIRMWARE_VERSION);

  http.begin(client, url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    deserializeJson(doc, payload);

    bool updateAvailable = doc["updateAvailable"];
    
    if (updateAvailable) {
      String updateUrl = doc["url"].as<String>();
      if (updateUrl.startsWith("/")) {
        updateUrl = "https://" + String(SERVER_HOST) + updateUrl;
      }
      
      Serial.printf("[OTA] Update available! Downloading from: %s\n", updateUrl.c_str());
      
      // Setup progress callback
      httpUpdate.onProgress([](int cur, int total) {
        static int lastProgress = -1;
        int progress = (cur * 100) / total;
        if (progress != lastProgress) {
          lastProgress = progress;
          Serial.printf("[OTA] Progress: %d%%\n", progress);
          reportOTAProgress(progress, cur, total);
        }
      });

      // Perform update
      t_httpUpdate_return ret = httpUpdate.update(client, updateUrl);

      switch (ret) {
        case HTTP_UPDATE_FAILED:
          Serial.printf("[OTA] Update failed (%d): %s\n", httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
          reportOTAResult("failed", httpUpdate.getLastErrorString());
          break;
        case HTTP_UPDATE_NO_UPDATES:
          Serial.println("[OTA] No updates");
          break;
        case HTTP_UPDATE_OK:
          Serial.println("[OTA] Success! Rebooting...");
          reportOTAResult("success");
          delay(1000);
          ESP.restart();
          break;
      }
    } else {
      Serial.println("[OTA] System is up to date.");
    }
  } else {
    Serial.printf("[OTA] Check failed, code: %d\n", httpCode);
  }
  
  http.end();
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = "https://" + String(SERVER_HOST) + "/ota/commands?mac=" + macAddress;

  http.begin(client, url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    deserializeJson(doc, payload);

    JsonArray commands = doc.as<JsonArray>();
    for (JsonObject cmd : commands) {
      int id = cmd["id"];
      String type = cmd["command"];
      Serial.printf("[POLL] Received Command: %s (ID: %d)\n", type.c_str(), id);

      if (type == "reboot") {
        acknowledgeCommand(id, "success", "Rebooting via Poll...");
        delay(1000);
        ESP.restart();
      } else if (type == "status") {
        String status = "FreeHeap: " + String(ESP.getFreeHeap());
        acknowledgeCommand(id, "success", status);
      }
    }
  }
  http.end();
}

// =================WEBSOCKET HANDLERS=================

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WS] Connected to %s\n", payload);
      break;
    case WStype_TEXT:
      {
        StaticJsonDocument<512> doc;
        if (deserializeJson(doc, payload)) return;

        const char* msgType = doc["type"];
        if (msgType && strcmp(msgType, "command") == 0) {
          JsonObject cmd = doc["command"];
          int id = cmd["id"];
          String type = cmd["command"];
          
          Serial.printf("[WS] Command: %s (ID: %d)\n", type.c_str(), id);

          if (type == "reboot") {
            acknowledgeCommand(id, "success", "Rebooting via WS...");
            delay(1000);
            ESP.restart();
          } else if (type == "status") {
             String status = "Uptime: " + String(millis()/1000) + "s, Heap: " + String(ESP.getFreeHeap());
             acknowledgeCommand(id, "success", status);
          } else {
             acknowledgeCommand(id, "failed", "Unknown command type");
          }
        }
      }
      break;
  }
}

// =================SETUP & LOOP=================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected!");

  macAddress = getMacAddress();
  Serial.printf("[Device] MAC: %s | Version: %s\n", macAddress.c_str(), FIRMWARE_VERSION);

  webSocket.beginSSL(SERVER_HOST, SERVER_PORT, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  sendHeartbeat();
  checkForUpdates();
}

void loop() {
  webSocket.loop();

  unsigned long currentMillis = millis();

  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = currentMillis;
    sendHeartbeat();
  }

  if (currentMillis - lastOtaCheck >= OTA_CHECK_INTERVAL) {
    lastOtaCheck = currentMillis;
    checkForUpdates();
  }

  // Fallback Polling if WS is not connected or periodically
  if (currentMillis - lastCommandPoll >= COMMAND_POLL_INTERVAL) {
    lastCommandPoll = currentMillis;
    pollCommands();
  }
}
