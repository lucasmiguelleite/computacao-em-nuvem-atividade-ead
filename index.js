const mqtt = require("mqtt");
const fs = require("fs");
const mysql = require("mysql2");
require("dotenv").config();

// MySQL (RDS)
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// MQTT (IoT Core)
const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  protocol: "mqtts",
  port: 8883,
  key: fs.readFileSync("./certs/private.pem.key"),
  cert: fs.readFileSync("./certs/certificate.pem.crt"),
  ca: fs.readFileSync("./certs/AmazonRootCA1.pem"),
});

client.on("connect", () => {
  console.log("Conectado MQTT");
  client.subscribe("sensor/dados");
});

client.on("message", (topic, message) => {
  const valor = message.toString();

  db.query("INSERT INTO dados (valor) VALUES (?)", [valor], () =>
    console.log("Salvo no banco"),
  );
});
