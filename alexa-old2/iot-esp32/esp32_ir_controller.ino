#include <WiFi.h>
#include <WebServer.h>
#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <ir_Gree.h> // Exemplo para ar-condicionado Gree. Adapte para sua marca.
#include <ArduinoJson.h>

// Substitua pelas suas credenciais de WiFi
const char* ssid = "SEU_WIFI_SSID";
const char* password = "SUA_SENHA_WIFI";

// Pino GPIO para o LED IR Emissor
const uint16_t kIrLed = 4; // GPIO 4

IRsend irsend(kIrLed);  // Objeto para enviar sinais IR

// Exemplo para ar-condicionado Gree. Adapte para sua marca e modelo.
// Você precisará aprender os códigos IR do seu controle remoto.
// Use o exemplo IRrecvDumpV3 da biblioteca IRremoteESP8266 para isso.
// Para Gree, a classe IRGreeAC lida com a maioria dos estados.
IRGreeAC ac(kIrLed); // Objeto para controle de AC Gree

WebServer server(80); // Servidor web na porta 80

void handleRoot() {
  server.send(200, "text/plain", "ESP32 IR Controller is running!");
}

void handleLigarAr() {
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    DynamicJsonDocument doc(128);
    deserializeJson(doc, body);
    int temperatura = doc["temperatura"] | 22; // Padrão 22 se não especificado
    ac.setPower(true); // Ligar
    ac.setTemp(temperatura); // Ajustar temperatura
    ac.setFan(kGreeAcFanAuto); // Fan automático
    ac.setMode(kGreeAcAuto); // Modo automático
    ac.send();
    server.send(200, "application/json", "{\"message\": \"Ar-condicionado ligado.\"}");
  } else {
    ac.setPower(true); // Ligar
    ac.setTemp(22); // Padrão 22
    ac.setFan(kGreeAcFanAuto); // Fan automático
    ac.setMode(kGreeAcAuto); // Modo automático
    ac.send();
    server.send(200, "application/json", "{\"message\": \"Ar-condicionado ligado com temperatura padrão (22C).\"}");
  }
}

void handleDesligarAr() {
  ac.setPower(false); // Desligar
  ac.send();
  server.send(200, "application/json", "{\"message\": \"Ar-condicionado desligado.\"}");
}

void handleAjustarTemperatura() {
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    DynamicJsonDocument doc(128);
    deserializeJson(doc, body);
    int temperatura = doc["temperatura"];
    if (temperatura >= 16 && temperatura <= 30) { // Validação simples
      ac.setPower(true); // Garante que está ligado para ajustar
      ac.setTemp(temperatura);
      ac.send();
      server.send(200, "application/json", "{\"message\": \"Temperatura ajustada.\"}");
    } else {
      server.send(400, "application/json", "{\"error\": \"Temperatura fora da faixa permitida (16-30C).\"}");
    }
  } else {
    server.send(400, "application/json", "{\"error\": \"Corpo da requisição inválido.\"}");
  }
}

void setup() {
  Serial.begin(115200);
  irsend.begin();
  ac.begin(); // Inicializa o controle do AC

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/ar/ligar", HTTP_POST, handleLigarAr);
  server.on("/ar/desligar", HTTP_POST, handleDesligarAr);
  server.on("/ar/temperatura", HTTP_POST, handleAjustarTemperatura);

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}
