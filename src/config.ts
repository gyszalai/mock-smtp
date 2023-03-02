import { Logger } from "pino"
import { envSchema, JSONSchemaType } from "env-schema"

export interface Config {
    LOGLEVEL: string
    HTTP_PORT: number
    SMTP_PORT: number
    SMTP_SECURE: boolean
    SMTP_USER: string
    SMTP_PASSWORD: string
    MAX_MESSAGE_COUNT: number
}

const schema: JSONSchemaType<Config> = {
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

export default function (logger: Logger): Config {
    logger.debug("loading configuration...")
    const config = envSchema({
        schema
    })
    logger.debug({ config }, "configuration loaded")
    return config
}
