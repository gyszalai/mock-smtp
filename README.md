# Mock SMTP server for integration tests

You can run this mock SMTP server as a standalone Docker container or directly from JS or TS code

## Building

```bash
npm run docker:build
```

## Releasing

```bash
npm run release
```

## Using as a container

```bash
export LOGLEVEL="debug"
export HTTP_PORT="1080"
export SMTP_PORT="1025"
export SMTP_SECURE="true"
export SMTP_USER="username"
export SMTP_PASSWORD="password"
export MAX_MESSAGE_COUNT="100"
docker run -p 1025:1025 -p 1080:1080 gyszalai/mock-smtp:latest
```

## Using from code

```ts
import fs from "node:fs"
import pino from "pino"
import createMockSmtpServer, { SmtpConfig } from "@gyszalai/mock-smtp"

const logger = pino({ level: "debug" })

const config: SmtpConfig = {
    port: 1025,
    username: "my_smtp_username",
    password: "my_smtp_password",
    secure: true,
    key: fs.readFileSync("smtp_key.pem"), // private key file in PEM or DER format
    cert: fs.readFileSync("smtp_cert.pem") // certificate file in PEM or DER format
}

const mockSmtpServer = createMockSmtpServer(logger, config, 100)
try {
    await mockSmtpServer.start()
    // send e-mails
    // ...
    // check if the e-mail messages are received via the message store API
    const messages = mockSmtpServer.getMessageStore().findMessages({ from: "someone@something.com" }, 1, true)
    if (messages[0].messageType === "myMessageType") {
        console.log("yay!")
    }
} finally {
    await mockSmtpServer.close()
}
```
