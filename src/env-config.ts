import { Logger } from "pino"
import { envSchema, JSONSchemaType } from "env-schema"
import { Config } from "./types.js"

interface EnvConfig {
    LOGLEVEL: string
    HTTP_PORT: number
    SMTP_PORT: number
    SMTP_SECURE: boolean
    SMTP_USER: string
    SMTP_PASSWORD: string
    MAX_MESSAGE_COUNT: number
}

const schema: JSONSchemaType<EnvConfig> = {
    type: "object",
    required: [],
    properties: {
        LOGLEVEL: {
            type: "string",
            default: "info"
        },
        HTTP_PORT: {
            type: "number",
            default: 1080
        },
        SMTP_PORT: {
            type: "number",
            default: 1025
        },
        SMTP_SECURE: {
            type: "boolean",
            default: true
        },
        SMTP_USER: {
            type: "string",
            default: "user"
        },
        SMTP_PASSWORD: {
            type: "string",
            default: "password"
        },
        MAX_MESSAGE_COUNT: {
            type: "number",
            default: 100
        }
    }
}

/**
 * Reads and validates the configuration 
 * @param logger 
 * @returns 
 */
export default function (logger: Logger): Config {
    logger.debug("loading configuration...")
    const envConfig = envSchema({ schema })
    const config = {
        loglevel: envConfig.LOGLEVEL,
        httpPort: envConfig.HTTP_PORT,
        smtp: {
            port: envConfig.SMTP_PORT,
            secure: envConfig.SMTP_SECURE,
            username: envConfig.SMTP_USER,
            password: envConfig.SMTP_PASSWORD
        },
        maxMessageCount: envConfig.MAX_MESSAGE_COUNT
    }
    logger.debug({ config: envConfig }, "configuration loaded")
    return config
}
