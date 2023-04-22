/* eslint-disable no-console */
import fs from "node:fs"
import path from "node:path"
import assert from "node:assert"
import { fileURLToPath } from "node:url"
import pino from "pino"
import nodemailer from "nodemailer"

import createMockSmtpServer, { SmtpConfig } from "./smtp-server.js"

const dirname = fileURLToPath(new URL(".", import.meta.url))
const logger = pino({ 
    level: "debug",
    formatters: {
        level: (label) => ({ level: label })
    }
})

const smtpPort = 1025
const smtpUsername = "my_smtp_username"
const smtpPassword ="my_smtp_password"

const config: SmtpConfig = {
    port: smtpPort,
    username: smtpUsername,
    password: smtpPassword,
    secure: true,
    key: fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.privkey.pem")),
    cert: fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.cert.pem"))
}

const auth = { user: smtpUsername, pass: smtpPassword }
const transporter = nodemailer.createTransport({
    connectionTimeout: 5000, // how many milliseconds to wait for the connection to establish
    greetingTimeout: 10000, // how many milliseconds to wait for the greeting after connection is established
    socketTimeout: 16000, // how many milliseconds of inactivity to allow
    host: "127.0.0.1",
    port: smtpPort,
    secure: true,
    requireTLS: true,
    tls: { rejectUnauthorized: false },
    auth
})

const fromAddress = "sender.name1@somedomain.xyz"
const message = {
    from: { name: "Sender Name 1", address: fromAddress },
    to: [{ name: "Receiver Name 1", address: "receiver.name1@somedomain.xyz" }],
    cc: [{ name: "CC Name 1", address: "cc.name1@somedomain.xyz" }],
    subject: "Some subject 1",
    text: "This is the message body 1",
    messageId: "my_message_id1",
    headers: { "x-message-type": "myMessageType" }
}

async function start() {
    const mockSmtpServer = createMockSmtpServer(logger, config, 100)
    try {
        await mockSmtpServer.start()
        // send e-mail
        logger.info("Sending message")
        const info = await transporter.sendMail(message)
        logger.info("SMTP response: " + info.response)
        assert(info.response.match(/^250 OK:.+$/))
        // check if the e-mail message has been received
        const messages = mockSmtpServer.getMessageStore().findMessages({ from: fromAddress }, 1, true)
        if (messages[0].messageType === "myMessageType") {
            logger.info("yay!")
        }
    } finally {
        await mockSmtpServer.close()
    }
}

start()
