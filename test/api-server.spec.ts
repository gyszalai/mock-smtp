import { expect } from "chai"
import { it, describe } from "mocha"
import supertest from "supertest"
import { SendMailOptions } from "nodemailer"

import messages, { HeaderObject, AddressObject } from "./messages.js"

export default (httpPort: number): void => {
    const api = supertest(`http://127.0.0.1:${httpPort}`)

    describe("Querying e-mail via the API", function () {
        it("GET /messages should return all e-mail messages", async () => {
            return api
                .get("/messages")
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    expect(messageListRes.length).to.be.equal(messages.length)
                })
        })
        it("GET /messages with reverse=true should return all e-mail messages in reverse order", async () => {
            return api
                .get("/messages")
                .query({ reverse: "true" })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes: SendMailOptions[] = res.body
                    expect(messageListRes.length).to.be.equal(messages.length)
                    const reverseMessageIds = [...messages].reverse().map((m) => m.messageId)
                    expect(messageListRes.map((m) => m.messageId)).to.deep.equal(reverseMessageIds)
                })
        })
        it("GET /messages with count=3 should return only 3 messages", async () => {
            const count = 3
            return api
                .get("/messages")
                .query({ count })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes: SendMailOptions[] = res.body
                    expect(messageListRes.length).to.be.equal(count)
                    const messageIds = [...messages].map((m) => m.messageId).slice(0, count)
                    expect(messageListRes.map((m) => m.messageId)).to.deep.equal(messageIds)
                })
        })

        it("GET /messages with messageType param should return the appropriate e-mail message", async () => {
            const headers = messages[0].headers as HeaderObject
            const messageType = headers["x-message-type"]
            return api
                .get("/messages")
                .query({ messageType })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    expect(messageListRes.length).to.be.equal(1)
                    expect(messageListRes[0].messageType).to.equal(messageType)
                })
        })
        it("GET /messages with 'from' param should return the appropriate e-mail message", async () => {
            const from = messages[1].from as AddressObject
            return api
                .get("/messages")
                .query({ from: from.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    expect(messageListRes.length).to.be.equal(1)
                    expect(messageListRes[0].from.address).to.equal(from.address)
                })
        })
        it("GET /messages with 'from' and 'to' params should return the appropriate e-mail message", async () => {
            const from = messages[1].from as AddressObject
            const toArray = messages[1].to as AddressObject[]
            const to = toArray[0] as AddressObject
            return api
                .get("/messages")
                .query({ from: from.address, to: to.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    expect(messageListRes.length).to.be.equal(1)
                    expect(messageListRes[0].from.address).to.equal(from.address)
                })
        })
        it("GET /messages with 'to' param should return the appropriate e-mail message", async () => {
            const toField = messages[1].to as AddressObject[]
            const to = toField[0]
            return api
                .get("/messages")
                .query({ to: to.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    expect(messageListRes.length).to.be.equal(2)
                    expect(messageListRes[0].to).to.deep.include(to)
                    expect(messageListRes[1].to).to.deep.include(to)
                })
        })
        it("GET /messages with 'cc' param should return the appropriate e-mail message", async () => {
            const ccField = messages[1].cc as AddressObject[]
            const cc = ccField[0]
            return api
                .get("/messages")
                .query({ cc: cc.address })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    expect(messageListRes.length).to.be.equal(2)
                    expect(messageListRes[0].cc).to.deep.include(cc)
                    expect(messageListRes[1].cc).to.deep.include(cc)
                })
        })
        it("GET /messages with 'messageType=myMessageType6' param should return the appropriate e-mail message, that has an attachment", async () => {
            const message6 = messages[5]
            return api
                .get("/messages")
                .query({ messageType: 'myMessageType6' })
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    console.log('messages:', JSON.stringify(messageListRes))
                    expect(messageListRes.length).to.be.equal(1)
                    const message6Res = messageListRes[0]
                    expect(message6Res.messageId).to.equal(message6.messageId)
                    expect(message6Res.attachments?.length).to.equal(1)
                })
        })
        it("DELETE /messages should delete the messages and respond with HTTP 204", async () => {
            await api.delete("/messages").expect(204)
            return api
                .get("/messages")
                .expect(200)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect((res) => {
                    const messageListRes = res.body
                    expect(messageListRes.length).to.be.equal(0)
                })
        })
    })
}
