import { SendMailOptions } from "nodemailer"

export interface HeaderObject {
    [headerName: string]: string
}

export interface AddressObject {
    name: string
    address: string
}

const messages: SendMailOptions[] = [
    {
        from: { name: "Sender Name 1", address: "sender.name1@somedomain.xyz" },
        to: [{ name: "Receiver Name 1", address: "receiver.name1@somedomain.xyz" }],
        cc: [{ name: "CC Name 1", address: "cc.name1@somedomain.xyz" }],
        subject: "Some subject 1",
        text: "This is the message body 1",
        messageId: "my_message_id1",
        headers: { "x-message-type": "myMessageType1" }
    },
    {
        from: { name: "Sender Name 2", address: "sender.name2@somedomain.xyz" },
        to: [
            { name: "Receiver Name 1", address: "receiver.name1@somedomain.xyz" },
            { name: "Receiver Name 2", address: "receiver.name2@somedomain.xyz" }
        ],
        cc: [
            { name: "CC Name 1", address: "cc.name1@somedomain.xyz" },
            { name: "CC Name 2", address: "cc.name2@somedomain.xyz" }
        ],
        subject: "Some subject 2",
        text: "This is the message body 2",
        messageId: "my_message_id2",
        headers: { "x-message-type": "myMessageType2" }
    },
    {
        from: { name: "Sender Name 3", address: "sender.name3@somedomain.xyz" },
        to: [{ name: "Receiver Name 3", address: "receiver.name3@somedomain.xyz" }],
        subject: "Some subject 3",
        text: "This is the message body 3",
        messageId: "my_message_id3",
        headers: { "x-message-type": "myMessageType3" }
    },
    {
        from: { name: "Sender Name 4", address: "sender.name4@somedomain.xyz" },
        to: [{ name: "Receiver Name 4", address: "receiver.name4@somedomain.xyz" }],
        subject: "Some subject 4",
        text: "This is the message body 4",
        messageId: "my_message_id4",
        headers: { "x-message-type": "myMessageType4" }
    },
    {
        from: { name: "Sender Name 5", address: "sender.name5@somedomain.xyz" },
        to: [{ name: "Receiver Name 5", address: "receiver.name5@somedomain.xyz" }],
        subject: "Some subject 5",
        text: "This is the message body 5",
        messageId: "my_message_id5",
        headers: { "x-message-type": "myMessageType5" }
    },
    {
        from: { name: "Sender Name 6", address: "sender.name6@somedomain.xyz" },
        to: [{ name: "Receiver Name 6", address: "receiver.name6@somedomain.xyz" }],
        subject: "Some subject 6",
        text: "This is the message body 6",
        html: "<p>This is the message body 6 as HTML</p>",
        messageId: "my_message_id6",
        headers: { "x-message-type": "myMessageType6" },
        attachments: [
            {
                filename: 'text1.txt',
                content: 'aGVsbG8gd29ybGQh',
                encoding: 'base64'
            }
        ]
    }
]

export default messages
