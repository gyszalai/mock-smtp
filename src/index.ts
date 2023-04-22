import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pino from "pino"

import { ClosableServer } from "./types.js"
import createEnvConfig from "./env-config.js"
import createServer from "./server.js"

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

let server: ClosableServer

/** Starts the SMTP and HTTP servers */
async function start() {
    const config = createEnvConfig(logger)
    if (config.smtp.secure === true) {
        const dirname = fileURLToPath(new URL(".", import.meta.url))
        const key = fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.privkey.pem"))
        const cert = fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.cert.pem"))
        config.smtp.key = key
        config.smtp.cert = cert
    }
    server = createServer(logger, config)
    try {
        await server.start()
    } catch (err) {
        logger.error(err)
        process.exit(1)
    }
}

/** Shuts down the SMTP and HTTP servers */
async function shutdown (exitCode: number) {
    logger.warn({ exitCode }, "shutting down...")
    try {
        await server.close()
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
