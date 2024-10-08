import path from "path"
import createDebug from "debug"
import waitOn from "wait-on"
import Docker from "dockerode"
import { describe, before, after } from "node:test"
import { fileURLToPath } from "url"

import createApiServerTests from "./api-server.spec.js"
import createSmtpServerTests from "./smtp-server.spec.js"

const debug = createDebug("test")

const smtpPort = 1025
const httpPort = 1080
const username = "mySmtpUser"
const password = "mySmtpPassword"
const maxMessageCount = 100

const docker = new Docker({ socketPath: "/var/run/docker.sock" })

const dirname = fileURLToPath(new URL(".", import.meta.url))

describe("Mock SMTP server with Docker", () => {
    let container: Docker.Container
    const imageName = "mock-smtp-server:e2e"
    const containerName = "mock_smtp_server"
    //
    before(async function () {
        const contextPath = path.join(dirname, "..")
        await removeContainer()
        debug("*** Building image, context path:", contextPath)
        const imgStream = await docker.buildImage(
            { context: contextPath, src: ["Dockerfile", "dist", "keys", "src", "tsconfig.json", "package.json", "package-lock.json"] },
            { t: imageName }
        )
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(
                imgStream,
                (err, res) => (err ? reject(err) : resolve(res)),
                (data) => debug(data.stream)
            )
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
                `SMTP_USER=${username}`,
                `SMTP_PASSWORD=${password}`,
                "SMTP_SECURE=true",
                `MAX_MESSAGE_COUNT=${maxMessageCount}`
            ]
        })
        debug("*** container created")
        await container.start()
        await container.attach({ stream: true, stdout: true, stderr: true })
        // const cntStream = await container.attach({ stream: true, stdout: true, stderr: true })
        // cntStream.pipe(process.stdout)
        debug("*** container started")
        await waitOn({
            resources: [`tcp:localhost:${smtpPort}`, `http://localhost:${httpPort}`],
            delay: 500,
            timeout: 10000,
            log: false
        })
    }, { timeout: 60000 })

    after(async function () {
        await removeContainer()
    })

    async function removeContainer(): Promise<void> {
        const containerList = await docker.listContainers({ all: true })
        const containerInfo = containerList.find((cntInfo) => cntInfo.Names.includes("/" + containerName))
        if (containerInfo) {
            debug(`*** container '${containerName}' exists, removing`)
            const runningContainer = docker.getContainer(containerName)
            await runningContainer.remove({ force: true })
            debug(`*** container '${containerName}' removed`)
            const image = await docker.getImage(imageName)
            image.remove()
            debug("*** image removed")
        } else {
            debug("*** container is not running, nothing to stop")
        }
    }

    createSmtpServerTests(smtpPort, username, password)
    createApiServerTests(httpPort)
})
