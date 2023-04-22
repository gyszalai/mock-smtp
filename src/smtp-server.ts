import { Logger } from "pino"
import { SMTPServer } from "smtp-server"
import { ParsedMail, simpleParser } from "mailparser"

import { ClosableServer, SmtpConfig } from "./types.js"
import createMessageStore, { MessageStore } from "./message-store.js"

export interface MockSmtpServer extends ClosableServer {
    getMessageStore(): MessageStore
}

export { SmtpConfig } from "./types.js"

/**
 * Creates an SMTP server instance
 * @param logger Pino logger
 * @param smtpConfig SMTP server configuration
 * @param maxMessageCount The number of received e-mail messages to keep in the message store
 * @returns A closable mock SMTP sserver instance
 */
export default function (logger: Logger, smtpConfig: SmtpConfig, maxMessageCount: number): MockSmtpServer {
    const messageStore = createMessageStore(logger, maxMessageCount)
    const { port, username: _username, password: _password, secure, key, cert } = smtpConfig
    const smtpServer = new SMTPServer({
        secure,
        key,
        cert,
        authMethods: ["LOGIN"],
        onAuth ({ method, username, password }, session, callback) {
            logger.debug("authenticating, method: " + method)
            if (username === _username && password === _password) {
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
            smtpServer.listen(port, "0.0.0.0", () => {
                smtpServer.removeListener("error", reject)
                resolve()
            })
        })
        smtpServer.on("error", (err) => {
            logger.error(err, "SMTP server error")
        })
        logger.info(`SMTP server listening on port ${port}`)
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

    /**
     * Returns the message store in which this server stores the received e-mail messages
     * @returns The message store
     */
    function getMessageStore(): MessageStore {
        return messageStore
    }

    return {
        start, close, getMessageStore
    }
}
