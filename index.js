const mqtt = require("mqtt");
const fs = require("fs");
const mysql = require("mysql2");
require("dotenv").config();

console.log("App iniciado");

// MySQL (RDS)
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar no MySQL:", err);
  } else {
    console.log("Conectado ao MySQL");
  }
});

// MQTT (IoT Core)
const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  protocol: "mqtts",
  port: 8883,
  key: fs.readFileSync("./certs/device01.private.key"),
  cert: fs.readFileSync("./certs/device01.cert.pem"),
  ca: fs.readFileSync("./certs/root-CA.crt"),
});

client.on("connect", () => {
  console.log("Conectado MQTT");
  client.subscribe("sensor/dados");
});

client.on("error", (err) => {
  console.error("Erro MQTT:", err);
});

client.on("message", (topic, message) => {
  const valor = message.toString();

  console.log("Mensagem recebida:", valor);

  db.query("INSERT INTO dados (valor) VALUES (?)", [valor], (err) => {
    if (err) {
      console.error("Erro ao salvar:", err);
    } else {
      console.log("Salvo no banco");
    }
  });
});

db.on("error", (err) => {
  console.error("Erro MySQL:", err);
});
