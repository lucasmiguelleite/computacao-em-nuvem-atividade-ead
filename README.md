# Projeto IoT com AWS (EC2 + RDS + IoT Core)

Este projeto demonstra a integração entre serviços da AWS utilizando:

- AWS IoT Core (broker MQTT)
- EC2 (Node.js)
- RDS (MySQL)

Arquitetura:

IoT Core → EC2 (Node.js) → RDS (MySQL)

---

## Pré-requisitos

- Conta na AWS
- Node.js instalado (para testes locais, opcional)
- Chave `.pem` para acesso à EC2
- Git instalado

---

## 1. Criar o banco de dados (RDS)

1. Acesse o serviço RDS na AWS
2. Crie um banco MySQL
3. Configure:
   - Usuário: `admin`
   - Senha: sua senha
   - Acesso público: **YES**

4. Após criar, copie o endpoint

### Criar banco e tabela

Conecte via terminal:

```bash
mysql -h SEU_ENDPOINT_RDS -u admin -p
```

Execute:

```sql
CREATE DATABASE iotdb;
USE iotdb;

CREATE TABLE dados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valor TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Criar a instância EC2

1. Acesse EC2 na AWS
2. Crie uma instância Ubuntu
3. Libere a porta 22 (SSH)
4. Baixe a chave `.pem`

### Acessar via SSH

```bash
ssh -i sua-chave.pem ubuntu@SEU_IP
```

---

## 3. Configurar ambiente na EC2

### Atualizar sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 4. Clonar projeto

```bash
git clone SEU_REPOSITORIO
cd SEU_REPOSITORIO
```

---

## 5. Instalar dependências

```bash
npm install mqtt mysql2 dotenv
```

---

## 6. Configurar AWS IoT Core

1. Acesse IoT Core
2. Vá em **Settings**
3. Copie o **endpoint (Nome de domínio)**

### Criar certificado

1. Vá em **Security → Certificates**
2. Crie um certificado
3. Baixe os arquivos:

- `.cert.pem`
- `.private.key`
- `AmazonRootCA1.pem`

### Criar policy

Use:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:*",
      "Resource": "*"
    }
  ]
}
```

Anexe a policy ao certificado.

---

## 7. Enviar certificados para EC2

```bash
scp -i sua-chave.pem certs.zip ubuntu@SEU_IP:/home/ubuntu/
```

Na EC2:

```bash
unzip certs.zip
mkdir certs
mv *.pem *.crt certs/
```

---

## 8. Configurar variáveis de ambiente

Crie arquivo `.env`:

```env
MQTT_HOST=SEU_ENDPOINT_IOT
DB_HOST=SEU_ENDPOINT_RDS
DB_USER=admin
DB_PASS=SUA_SENHA
DB_NAME=iotdb
```

---

## 9. Código principal (`index.js`)

```js
const mqtt = require("mqtt");
const fs = require("fs");
const mysql = require("mysql2");
require("dotenv").config();

console.log("App iniciado");

// MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Erro MySQL:", err);
  } else {
    console.log("Conectado ao MySQL");
  }
});

// MQTT
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
```

---

## 10. Executar aplicação

```bash
node index.js
```

Saída esperada:

```
App iniciado
Conectado ao MySQL
Conectado MQTT
```

---

## 11. Testar envio de dados

1. Vá no IoT Core
2. Acesse **MQTT Test Client**
3. Publicar:

- Topic: `sensor/dados`
- Payload:

```
25.5
```

---

## 12. Verificar no banco

```bash
mysql -h SEU_ENDPOINT_RDS -u admin -p
```

```sql
USE iotdb;
SELECT * FROM dados;
```

---

## Resultado esperado

A mensagem enviada via MQTT será:

- Recebida pela EC2
- Processada pelo Node.js
- Armazenada no RDS

---

## Observações

- Não use `https://` nos endpoints
- Certifique-se de que a porta 3306 (RDS) está liberada
- Certificado IoT deve estar **ACTIVE**
- Policy deve estar anexada

---

## Estrutura do projeto

```
.
├── index.js
├── package.json
├── .env
└── certs/
```

---

## Finalização

Este projeto demonstra uma arquitetura básica de IoT utilizando serviços em nuvem da AWS, integrando comunicação MQTT com persistência em banco de dados relacional.
