import { describe, it } from "node:test"
import assert from "node:assert"
import { isDeepStrictEqual } from "node:util"
import supertest from "supertest"
import { SendMailOptions } from "nodemailer"

import messages, { HeaderObject, AddressObject } from "./messages.js"

export default (httpPort: number): void => {
    const api = supertest(`http://127.0.0.1:${httpPort}`)

    describe("Querying e-mail via the API", function () {
        it("GET /messages should return all e-mail messages", async () => {
            await api
                .get("/messages")
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, messages.length)
                })
        })
        it("GET /messages with reverse=true should return all e-mail messages in reverse order", async () => {
            await api
                .get("/messages")
                .query({ reverse: "true" })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes: SendMailOptions[] = res.body
                    assert.equal(messageListRes.length, messages.length)
                    const reverseMessageIds = [...messages].reverse().map((m) => m.messageId)
                    assert.deepStrictEqual(messageListRes.map((m) => m.messageId), reverseMessageIds)
                })
        })
        it("GET /messages with count=3 should return only 3 messages", async () => {
            const count = 3
            await api
                .get("/messages")
                .query({ count })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes: SendMailOptions[] = res.body
                    assert.equal(messageListRes.length, count)
                    const messageIds = [...messages].map((m) => m.messageId).slice(0, count)
                    assert.deepStrictEqual(messageListRes.map((m) => m.messageId), messageIds)
                })
        })

        it("GET /messages with messageType param should return the appropriate e-mail message", async () => {
            const headers = messages[0].headers as HeaderObject
            const messageType = headers["x-message-type"]
            await api
                .get("/messages")
                .query({ messageType })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, 1)
                    assert.equal(messageListRes[0].messageType, messageType)
                })
        })
        it("GET /messages with 'from' param should return the appropriate e-mail message", async () => {
            const from = messages[1].from as AddressObject
            await api
                .get("/messages")
                .query({ from: from.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, 1)
                    assert.equal(messageListRes[0].from.address, from.address)
                })
        })
        it("GET /messages with 'from' and 'to' params should return the appropriate e-mail message", async () => {
            const from = messages[1].from as AddressObject
            const toArray = messages[1].to as AddressObject[]
            const to = toArray[0] as AddressObject
            await api
                .get("/messages")
                .query({ from: from.address, to: to.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, 1)
                    assert.equal(messageListRes[0].from.address, from.address)
                })
        })
        it("GET /messages with 'to' param should return the appropriate e-mail message", async () => {
            const toField = messages[1].to as AddressObject[]
            const to = toField[0]
            await api
                .get("/messages")
                .query({ to: to.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, 2)
                    assert(messageListRes[0].to?.some(addr => isDeepStrictEqual(addr, to)))
                    assert(messageListRes[1].to?.some(addr => isDeepStrictEqual(addr, to)))
                })
        })
        it("GET /messages with 'cc' param should return the appropriate e-mail message", async () => {
            const ccField = messages[1].cc as AddressObject[]
            const cc = ccField[0]
            await api
                .get("/messages")
                .query({ cc: cc.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, 2)
                    assert(messageListRes[0].cc?.some(addr => isDeepStrictEqual(addr, cc)))
                    assert(messageListRes[1].cc?.some(addr => isDeepStrictEqual(addr, cc)))
                })
        })
        it("GET /messages with 'messageType=myMessageType6' param should return the appropriate e-mail message, that has an attachment", async () => {
            const message6 = messages[5]
            await api
                .get("/messages")
                .query({ messageType: 'myMessageType6' })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, 1)
                    const message6Res = messageListRes[0]
                    assert.equal(message6Res.messageId, message6.messageId)
                    assert.equal(message6Res.attachments?.length, 1)
                })
        })
        it("DELETE /messages should delete the messages and respond with HTTP 204", async () => {
            await api.delete("/messages").expect(204)
            await api
                .get("/messages")
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    assert.equal(messageListRes.length, 0)
                })
        })
    })
}
