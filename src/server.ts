import { Logger } from "pino"

import { Config, ClosableServer } from "./types.js"

import createApiServer from "./api-server.js"
import createSmtpServer, { MockSmtpServer } from "./smtp-server.js"

export { Config, ClosableServer } from "./types.js"

/**
 * Creates a closable server instance that starts and closes the API and SMTP servers
 * @param logger Pino logger
 * @param config All config properties
 * @returns A closable server instance
 */
export default function (logger: Logger, config: Config): ClosableServer {
    let apiServer: ClosableServer
    let smtpServer: MockSmtpServer
    
    /** Starts the SMTP and HTTP servers */
    async function start() {
        const { httpPort, smtp, maxMessageCount } = config
        logger.info("HTTP port: " + httpPort)
        logger.info("SMTP port: " + smtp.port)
        smtpServer = createSmtpServer(logger, smtp, maxMessageCount)
        const messageStore = smtpServer.getMessageStore()
        apiServer = createApiServer(logger, httpPort, messageStore)
        // start the servers
        await apiServer.start()
        await smtpServer.start()
    }

    /** Closes the API and the SMTP servers */
    async function close() {        
        const promises = []
        if (apiServer) {
            promises.push(apiServer.close())
        }
        if (smtpServer) {
            promises.push(smtpServer.close())
        }
        await Promise.allSettled(promises)
    }

    return {
        start, close
    }
}
