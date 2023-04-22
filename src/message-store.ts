import { AddressObject, EmailAddress, Attachment, ParsedMail, Headers, HeaderValue } from "mailparser"
import { Logger } from "pino"

interface HeaderObject {
    [headerName: string]: HeaderValue
}

export interface Message {
    messageId?: string
    messageType: string
    from: EmailAddress
    to?: EmailAddress[]
    cc?: EmailAddress[]
    subject?: string
    html: string | false
    text?: string | undefined
    headers: HeaderObject
    attachments?: Attachment[] | undefined
}

export interface FindMessageOptions {
    messageType?: string
    from?: string
    to?: string
    cc?: string
}

export interface MessageStore {
    findMessages (options: FindMessageOptions, count: number, reverse: boolean): Message[]
    addMessage(parsedMail: ParsedMail): Message
    clear(): void
}

function createMessage (parsedMail: ParsedMail): Message {
    const headers = formatHeaders(parsedMail.headers)
    const messageType = headers["x-message-type"]?.toString()
    const from = parsedMail.from?.value[0] ?? { name: "Empty sender" }
    // to
    let to: EmailAddress[] | undefined
    if (Array.isArray(parsedMail.to)) {
        to = parsedMail.to.map((a: AddressObject) => a.value).flat()
    } else if (parsedMail.to) {
        to = parsedMail.to.value
    }
    // cc
    let cc: EmailAddress[] | undefined
    if (Array.isArray(parsedMail.cc)) {
        cc = parsedMail.cc.map((a: AddressObject) => a.value).flat()
    } else if (parsedMail.cc) {
        cc = parsedMail.cc.value
    }
    const messageId = parsedMail.messageId ? parsedMail.messageId.replace(/[<>]/g, "") : undefined
    const { subject, html, text, attachments } = parsedMail
    return { messageId, messageType, headers, from, to, cc, subject, html, text, attachments }
}

function formatHeaders (headers: Headers): HeaderObject {
    const obj: HeaderObject  = {}
    for (const [headerName, headerValue] of headers) {
        obj[headerName] = headerValue
    }
    return obj
}

export default function (logger: Logger, maxStoreCapacity: number): MessageStore {
    const messages: Message[] = []

    return {
        findMessages ({ messageType, from, to, cc }, count: number, reverse: boolean): Message[] {
            const messageList: Message[] = reverse ? [...messages].reverse() : messages
            let filteredMessageList: Message[] = messageList
            if (messageType) {
                filteredMessageList = filteredMessageList.filter((message) => message.messageType === messageType)
            }
            if (from) {
                filteredMessageList = filteredMessageList.filter((message) => message.from.address === from)
            }
            if (to) {
                filteredMessageList = filteredMessageList.filter((message) => message.to?.some((e) => e.address === to))
            }
            if (cc) {
                filteredMessageList = filteredMessageList.filter((message) => message.cc && message.cc.some((e) => e.address === cc))
            }
            if (count !== undefined && count < filteredMessageList.length) {
                filteredMessageList = filteredMessageList.slice(0, count)
            }
            return filteredMessageList
        },
        /**
         * Adds a new message to the store
         * @param parsedMail The parsed email message
         */
        addMessage(parsedMail: ParsedMail): Message {
            const message: Message = createMessage(parsedMail)
            const { messageId, messageType } = message
            logger.debug({ messageId, messageType }, "adding new message to the store")
            messages.push(message)
            if (messages.length > maxStoreCapacity) {
                messages.splice(0, 1)
            }
            return message
        },
        /**
         * Clears the message store
         */
        clear(): void {
            messages.splice(0, messages.length)
        }
    }

}

