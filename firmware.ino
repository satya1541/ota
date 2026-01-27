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
// Using your production domain
const char* SERVER_HOST = "ota.thynxai.cloud"; 
const int SERVER_PORT = 443;  // HTTPS port
const bool USE_HTTPS = true;  // Enable HTTPS

// 3. Device Identity
String macAddress; // Will be read from hardware
String deviceName = "ESP32-Device";
const char* FIRMWARE_VERSION = "0.0.1"; // Initial version

// =================GLOBALS=================

WebSocketsClient webSocket;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds
unsigned long lastOtaCheck = 0;
const unsigned long OTA_CHECK_INTERVAL = 60000 * 60; // Check every hour (or manually triggers)

// =================HELPER FUNCTIONS=================

String getMacAddress() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  return mac;
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate validation (for testing)
  HTTPClient http;

  String url = "https://" + String(SERVER_HOST) + "/api/devices/" + macAddress + "/heartbeat";
  
  StaticJsonDocument<200> doc;
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["signalStrength"] = WiFi.RSSI();
  doc["version"] = FIRMWARE_VERSION;

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
  client.setInsecure(); // Skip certificate validation (for testing)
  HTTPClient http;

  String url = "https://" + String(SERVER_HOST) + "/api/ota/check?deviceId=" + macAddress + "&currentVersion=" + FIRMWARE_VERSION;

  http.begin(client, url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    deserializeJson(doc, payload);

    bool updateAvailable = doc["updateAvailable"];
    
    if (updateAvailable) {
      String updateUrl = doc["url"].as<String>();
      // If URL is relative, prepend server host
      if (updateUrl.startsWith("/")) {
        updateUrl = "https://" + String(SERVER_HOST) + updateUrl;
      }
      
      Serial.printf("[OTA] Update available! Downloading from: %s\n", updateUrl.c_str());
      
      // Perform the update
      t_httpUpdate_return ret = httpUpdate.update(client, updateUrl);

      switch (ret) {
        case HTTP_UPDATE_FAILED:
          Serial.printf("[OTA] Update failed. Error (%d): %s\n", httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
          break;
        case HTTP_UPDATE_NO_UPDATES:
          Serial.println("[OTA] No updates (server returned no updates)");
          break;
        case HTTP_UPDATE_OK:
          Serial.println("[OTA] Update OK! Rebooting...");
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

// =================WEBSOCKET HANDLERS=================

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WS] Connected to %s\n", payload);
      
      // Subscribe to console commands
      {
        StaticJsonDocument<200> doc;
        doc["type"] = "subscribe-console";
        doc["deviceId"] = macAddress;
        String msg;
        serializeJson(doc, msg);
        webSocket.sendTXT(msg);
      }
      break;
      
    case WStype_TEXT:
      {
        Serial.printf("[WS] Message: %s\n", payload);
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload);

        if (error) {
          Serial.println("[WS] Failed to parse JSON");
          return;
        }

        const char* msgType = doc["type"];
        
        // Handle incoming commands
        if (strcmp(msgType, "command") == 0) {
          String command = doc["command"];
          String cmdId = doc["commandId"].as<String>(); // Just as example, schema uses int ID usually
          
          Serial.printf("[CMD] Received: %s\n", command.c_str());

          // Execute Command
          if (command == "reboot") {
            webSocket.sendTXT("{\"type\":\"command-ack\", \"status\":\"success\", \"response\":\"Rebooting...\"}");
            delay(1000);
            ESP.restart();
          } 
          else if (command == "factory_reset") {
            // Add reset logic here (e.g., clear Preferences)
             webSocket.sendTXT("{\"type\":\"command-ack\", \"status\":\"success\", \"response\":\"Factory reset initiated\"}");
          }
          else if (command == "status") {
             String status = "Uptime: " + String(millis()/1000) + "s, Heap: " + String(ESP.getFreeHeap());
             String resp = "{\"type\":\"command-ack\", \"status\":\"success\", \"response\":\"" + status + "\"}";
             webSocket.sendTXT(resp);
          }
          else {
            webSocket.sendTXT("{\"type\":\"command-ack\", \"status\":\"failed\", \"response\":\"Unknown command\"}");
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
  
  // 1. Init Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());

  // 2. Identify Device
  macAddress = getMacAddress();
  Serial.print("[Device] MAC: ");
  Serial.println(macAddress);

  // 3. Register Device (Optional - usually done via heartbeats implicitly or admin UI)
  // For this firmware, we'll just start sending heartbeats.

  // 4. Init WebSocket (Secure WSS)
  Serial.println("[WS] Connecting to server...");
  webSocket.beginSSL(SERVER_HOST, SERVER_PORT, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  // Initial Heartbeat
  sendHeartbeat();
  checkForUpdates();
}

void loop() {
  webSocket.loop();

  unsigned long currentMillis = millis();

  // Heartbeat Timer
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = currentMillis;
    sendHeartbeat();
  }

  // Periodic OTA Check
  if (currentMillis - lastOtaCheck >= OTA_CHECK_INTERVAL) {
    lastOtaCheck = currentMillis;
    checkForUpdates();
  }
}
