import fs from "fs"
import path from "path"
import createDebug from "debug"
import pino from "pino"
import { describe, before, after, it } from "node:test"
import assert from "node:assert"
import { isDeepStrictEqual } from "node:util"
import { fileURLToPath } from "url"

import createMockSmtpServer, { SmtpConfig, MockSmtpServer } from "../dist/smtp-server.js"
import createSmtpServerTests from "./smtp-server.spec.js"

import messages, { HeaderObject, AddressObject } from "./messages.js"
import { MessageStore } from "../dist/message-store.js"

const debug = createDebug("test")

const smtpPort = 1025
const username = "mySmtpUser"
const password = "mySmtpPassword"
const maxMessageCount = 100

const dirname = fileURLToPath(new URL(".", import.meta.url))

describe("Mock SMTP server without Docker", () => {
    const transport = pino.transport({
        target: "pino/file",
        options: { destination: "/dev/null" }
    })
    const logger = pino(transport)
    let mockSmtpServer: MockSmtpServer
    let messageStore: MessageStore
    before(async function () {
        const config: SmtpConfig = {
            port: smtpPort,
            username,
            password,
            secure: true,
            key: fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.privkey.pem")),
            cert: fs.readFileSync(path.join(dirname, "..", "keys", "smtp.server.cert.pem"))
        }
        mockSmtpServer = createMockSmtpServer(logger, config, maxMessageCount)
        debug("*** starting server")
        await mockSmtpServer.start()
        messageStore = mockSmtpServer.getMessageStore()
        debug("*** server started")
    }, { timeout: 10000 })

    after(async function () {
        await mockSmtpServer.close()
        debug("*** server stopped")
    })

    // send the test messages
    createSmtpServerTests(smtpPort, username, password)

    describe("MockSmtpServer", () => {
        describe("findMessages", () => {
            it("calling with no filters should return all e-mail messages", async () => {
                const messageList = messageStore.findMessages({}, 100, false)
                assert.equal(messageList.length, messages.length)
            })
            it("calling with no filters and reverse=true should return all e-mail messages in reverse order", async () => {
                const messageList = messageStore.findMessages({}, 100, true)
                assert.equal(messageList.length, messages.length)
                const reverseMessageIds = [...messages].reverse().map((m) => m.messageId)
                assert.deepEqual(messageList.map((m) => m.messageId), reverseMessageIds)
            })
            it("calling with count=3 should return only 3 messages", async () => {
                const count = 3
                const messageList = messageStore.findMessages({}, count, false)
                assert.equal(messageList.length, count)
                const messageIds = [...messages].map((m) => m.messageId).slice(0, count)
                assert.deepEqual(messageList.map((m) => m.messageId), messageIds)
            })
            it("calling with messageType param should return the appropriate e-mail message", async () => {
                const headers = messages[0].headers as HeaderObject
                const messageType = headers["x-message-type"]
                const messageList = messageStore.findMessages({ messageType }, 100, false)
                assert.equal(messageList.length, 1)
                assert.equal(messageList[0].messageType, messageType)
            })
            it("calling with 'from' param should return the appropriate e-mail message", async () => {
                const from = messages[1].from as AddressObject
                const messageList = messageStore.findMessages({ from: from.address }, 100, false)
                assert.equal(messageList.length, 1)
                assert.equal(messageList[0].from.address, from.address)
            })
            it("calling with 'from' and 'to' params should return the appropriate e-mail message", async () => {
                const from = messages[1].from as AddressObject
                const toArray = messages[1].to as AddressObject[]
                const to = toArray[0] as AddressObject
                const messageList = messageStore.findMessages({ from: from.address, to: to.address }, 100, false)
                assert.equal(messageList.length, 1)
                assert.equal(messageList[0].from.address, from.address)
                assert(messageList[0].to?.some(addr => isDeepStrictEqual(addr, to)))
            })
            it("calling with 'to' param should return the appropriate e-mail message", async () => {
                const toField = messages[1].to as AddressObject[]
                const to = toField[0]
                const messageList = messageStore.findMessages({ to: to.address }, 100, false)
                assert.equal(messageList.length, 2)
                assert(messageList[0].to?.some(addr => isDeepStrictEqual(addr, to)))
                assert(messageList[1].to?.some(addr => isDeepStrictEqual(addr, to)))
            })
            it("calling with 'cc' param should return the appropriate e-mail message", async () => {
                const ccField = messages[1].cc as AddressObject[]
                const cc = ccField[0]
                const messageList = messageStore.findMessages({ cc: cc.address }, 100, false)
                assert.equal(messageList.length, 2)
                assert(messageList[0].cc?.some(addr => isDeepStrictEqual(addr, cc)))
                assert(messageList[1].cc?.some(addr => isDeepStrictEqual(addr, cc)))
            })
        })
        describe("clear", () => {
            it("should delete all messages from the message store", async () => {
                messageStore.clear()
                const messageList = messageStore.findMessages({}, 100, false)
                assert.equal(messageList.length, 0)
            })
        })
    })
})
