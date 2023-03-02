import { Logger } from "pino"
import Fastify from "fastify"

import { Config } from "./config.js"
import { MessageStore } from "./message-store.js"

export interface ApiServer {
    start(): Promise<void>
    close(): Promise<void>
}

interface FilterQueryString {
    messageType: string
    from: string
    to: string
    cc: string
    count: number
    reverse: boolean
}

export default (logger: Logger, config: Config, messageStore: MessageStore): ApiServer => {
    const app = Fastify({ logger })
    const filterSchema = {
        querystring: {
            messageType: { type: "string", pattern: "^\\w+$" },
            from: { type: "string", pattern: "^[\\w0-9_\\-\\.@]+$" },
            to: { type: "string", pattern: "^[\\w0-9_\\-\\.@]+$" },
            cc: { type: "string", pattern: "^[\\w0-9_\\-\\.@]+$" },
            count: { type: "integer", minimum: 1, maximum: 100 },
            reverse: { type: "boolean" }
        }
    }

    app.head("/", async () => {
        return "ok"
    })
    app.get<{ Querystring: FilterQueryString }>("/messages", { schema: filterSchema }, async (request) => {
        const { messageType, from, to, cc, count, reverse } = request.query
        return messageStore.findMessages(messageType, from, to, cc, count, reverse)
    })
    app.delete("/messages", async (request, reply) => {
        messageStore.clear()
        reply.code(204).send()
    })

    return {
        async start(): Promise<void> {
            await app.ready()
            await app.listen({ host: "0.0.0.0", port: config.HTTP_PORT })
        },
        async close(): Promise<void> {
            logger.info("Stopping API server")
            await app.close()
        }
    }
}
