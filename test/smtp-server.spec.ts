import createDebug from "debug"
import nodemailer from "nodemailer"
import { describe, it } from "node:test"
import assert from 'node:assert'

import messages from "./messages.js"

const debug = createDebug("test")

export default (smtpPort: number, user: string, pass: string) => {
    const auth = { user, pass }
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

    describe("Sending e-mail", {timeout: 10000}, function () {
        it("should successfully send all e-mail messages", async function () {
            for (let i = 0; i < messages.length; i++) {
                debug("Sending message " + i)
                const info = await transporter.sendMail(messages[i])
                debug("SMTP info: ", info.response)
                assert.match(info.response, /^250 OK:.+$/)
            }
        })
    })
}
