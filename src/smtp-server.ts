import { Logger } from "pino"
import { SMTPServer } from "smtp-server"
import { ParsedMail, simpleParser } from "mailparser"

import { MessageStore } from "./message-store.js"
import { Config } from "./config.js"

export interface SmtpServer {
    start(): Promise<void>
    close(): Promise<void>
}

export default function (
    logger: Logger, config: Config, key: Buffer, cert: Buffer, 
    messageStore: MessageStore
): SmtpServer {
    const smtpPort = config.SMTP_PORT
    const smtpSecure = config.SMTP_SECURE
    const smtpUser = config.SMTP_USER
    const smtpPassword = config.SMTP_PASSWORD

    const smtpServer = new SMTPServer({
        secure: smtpSecure,
        key,
        cert,
        authMethods: ["LOGIN"],
        onAuth ({ method, username, password }, session, callback) {
            logger.debug("authenticating, method: " + method)
            if (username === smtpUser && password === smtpPassword) {
                logger.debug("auth OK")
                return callback(null, { user: username })
            }
            logger.debug("auth FAILED")
            callback(new Error("Auth failed"))
        },
        onConnect (session, callback) {
            logger.debug("client connected")
            return callback() // Accept the connection
        },
        onData (stream, session, callback) {
            logger.debug("message received")
            simpleParser(stream)
                .then((parsedMail: ParsedMail) => {
                    const message = messageStore.addMessage(parsedMail)
                    logger.debug(message.messageId, "message added to store")
                    callback()
                })
                .catch(callback)
        }
    })

    /** Starts the SMTP and HTTP servers */
    async function start () {
        await new Promise<void>((resolve, reject) => {
            smtpServer.on("error", reject)
            smtpServer.listen(smtpPort, "0.0.0.0", () => {
                smtpServer.removeListener("error", reject)
                resolve()
            })
        })
        smtpServer.on("error", (err) => {
            logger.error(err, "SMTP server error")
        })
        logger.info(`SMTP server listening on port ${smtpPort}`)
    }

    /** Closes the SMTP and HTTP servers */
    async function close () {
        logger.info("closing SMTP server")
        await new Promise<void>((resolve) => {
            smtpServer.close(() => {
                resolve()
            })
        })
    }

    return {
        start, close
    }
}
