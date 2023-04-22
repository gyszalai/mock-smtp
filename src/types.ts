export interface ClosableServer {
    start(): Promise<void>
    close(): Promise<void>
}

export interface SmtpConfig {
    port: number
    username: string
    password: string
    secure: boolean
    key?: string | Buffer
    cert?: string | Buffer
}

export interface Config {
    httpPort: number
    maxMessageCount: number
    smtp: SmtpConfig
}
