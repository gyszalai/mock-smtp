import fs from "fs"
import path from "path"
import createDebug from "debug"
import waitOn from "wait-on"
import "chai"
import pino from "pino"
import Docker from "dockerode"
import { describe, before, after } from "mocha"
import { fileURLToPath } from "url"

import { Config } from "../dist/config.js"
import createMessageStore from "../dist/message-store.js"
import createApiServer, { ApiServer } from "../dist/api-server.js"
import createSmtpServer, { SmtpServer } from "../dist/smtp-server.js"

import createApiServerTests from "./api-server.spec.js"
import createSmtpServerTests from "./smtp-server.spec.js"

const debug = createDebug("test")

const smtpPort = 1025
const httpPort = 1080
const user = "mySmtpUser"
const pass = "mySmtpPassword"
const maxMessages = 100

const docker = new Docker({ socketPath: "/var/run/docker.sock" })

const dirname = fileURLToPath(new URL(".", import.meta.url))

describe("Mock SMTP server with Docker", () => {
    let container: Docker.Container
    const imageName = "mock-smtp-server:e2e"
    const containerName = "mock_smtp_server"
    //
    before(async function () {
        this.timeout(60000)
        const contextPath = path.join(dirname, "..")
        await removeContainer()
        debug("*** Building image, context path:", contextPath)
        const imgStream = await docker.buildImage(
            { context: contextPath, src: [
                "Dockerfile",
                "dist",
                "keys",
                "package.json",
                "package-lock.json"
            ] }, { t: imageName }
        )
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(imgStream,
                (err, res) => err ? reject(err) : resolve(res),
                (data) => debug(data.stream))
        })
        debug("*** Image built")
        container = await docker.createContainer({
            Image: imageName,
            name: containerName,
            HostConfig: {
                PortBindings: {
                    [`${smtpPort}/tcp`]: [{ HostPort: `${smtpPort}` }],
                    [`${httpPort}/tcp`]: [{ HostPort: `${httpPort}` }]
                }
            },
            Env: [
                "LOGLEVEL=debug",
                `SMTP_PORT=${smtpPort}`,
                `HTTP_PORT=${httpPort}`,
                `SMTP_USER=${user}`,
                `SMTP_PASSWORD=${pass}`,
                "SMTP_SECURE=true",
                `MAX_MESSAGE_COUNT=${maxMessages}`
            ]
        })
        debug("*** container created")
        await container.start()
        await container.attach({ stream: true, stdout: true, stderr: true })
        // const cntStream = await container.attach({ stream: true, stdout: true, stderr: true })
        // cntStream.pipe(process.stdout)
        debug("*** container started")
        await waitOn({ resources: [`tcp:localhost:${smtpPort}`, `http://localhost:${httpPort}`], delay: 500, timeout: 10000, log: true })
    })

    after(async function () {
        await container.remove({ force: true })
        debug("*** container removed")
        const image = await docker.getImage(imageName)
        image.remove()
        debug("*** image removed")
    })

    async function removeContainer(): Promise<void> {
        const containerList = await docker.listContainers({ all: true })
        const containerInfo = containerList.find((cntInfo) => cntInfo.Names.includes("/" + containerName))
        if (containerInfo) {
            debug(`*** container '${containerName}' exists, removing`)
            const runningContainer = docker.getContainer(containerName)
            await runningContainer.remove({ force: true })
            debug(`*** container '${containerName}' removed`)
        } else {
            debug("*** container is not running, nothing to stop")
        }
    }

    createSmtpServerTests(smtpPort, user, pass)
    createApiServerTests(httpPort)
})

describe("Mock SMTP server without Docker", () => {
    const transport = pino.transport({
        target: "pino/file",
        options: { destination: "/dev/null" }
    })
    const logger = pino(transport)
    let smtpServer: SmtpServer
    let apiServer: ApiServer
    before(async function () {
        this.timeout(10000)
        const config: Config = {
            LOGLEVEL: "debug",
            HTTP_PORT: httpPort,
            SMTP_PORT: smtpPort,
            SMTP_USER: user,
            SMTP_PASSWORD: pass,
            SMTP_SECURE: true,
            MAX_MESSAGE_COUNT: maxMessages
        }
        const messageStore = createMessageStore(logger, maxMessages)
        const key = fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.privkey.pem"))
        const cert = fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.cert.pem"))
        smtpServer = createSmtpServer(logger, config, key, cert, messageStore)
        apiServer = createApiServer(logger, config, messageStore)
        debug("*** starting SMTP server")
        await smtpServer.start()
        debug("*** SMTP server started")
        await apiServer.start()
        debug("*** API server started")
    })

    after(async function () {
        await apiServer.close()
        debug("*** API server stopped")
        await smtpServer.close()
        debug("*** SMTP server stopped")
    })

    createSmtpServerTests(smtpPort, user, pass)
    createApiServerTests(httpPort)
})
