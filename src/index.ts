import fs from "fs"
import path from "path"
import pino from "pino"
import { fileURLToPath } from "url"

import createConfig from "./config.js"
import createApiServer, { ApiServer } from "./api-server.js"
import createSmtpServer, { SmtpServer } from "./smtp-server.js"
import createMessageStore from "./message-store.js"

const logger = pino({
    timestamp: pino.stdTimeFunctions.isoTime,
    base: null,
    level: process.env.LOGLEVEL || "info",
    formatters: {
        level (label) {
            return { level: label }
        }
    }
})

let apiServer: ApiServer
let smtpServer: SmtpServer

async function start() {
    const dirname = fileURLToPath(new URL(".", import.meta.url))
    const key = fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.privkey.pem"))
    const cert = fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.cert.pem"))
    const config = createConfig(logger)
    logger.info("HTTP_PORT: " + config.HTTP_PORT)
    logger.info("SMTP_PORT: " + config.SMTP_PORT)
    logger.info("SMTP_SECURE: " + config.SMTP_SECURE)
    const messageStore = createMessageStore(logger, config.MAX_MESSAGE_COUNT)
    apiServer = createApiServer(logger, config, messageStore)
    smtpServer = createSmtpServer(logger, config, key, cert, messageStore)
  
    // Start the server
    try {
        await apiServer.start()
        await smtpServer.start()
    } catch (err) {
        logger.error(err)
        process.exit(1)
    }
}

/** Shuts down the SMTP and HTTP servers */
async function shutdown (exitCode: number) {
    // const finalLogger = pino.final(logger)
    logger.warn({ exitCode }, "shutting down...")
    try {
        if (apiServer) {
            await apiServer.close()
        }
        if (smtpServer) {
            await smtpServer.close()
        }
        logger.warn({ exitCode }, "exiting")
        process.exit(exitCode)
    } catch (err) {
        logger.fatal(err, "error occured")
        process.exit(1)
    }
}
  
process.on("uncaughtException", function (err) {
    logger.error(err, "uncaughtException")
    shutdown(1)
})
  
process.on("unhandledRejection", function (err) {
    logger.error(err, "unhandledRejection")
    shutdown(1)
})
  
// SIGTERM handler
process.on("SIGTERM", () => {
    logger.warn("Caught SIGTERM, exiting...")
    shutdown(0)
})
  
// SIGINT handler (CTRL-C)
process.on("SIGINT", () => {
    logger.warn("Caught SIGINT, exiting...")
    shutdown(0)
})

start()
