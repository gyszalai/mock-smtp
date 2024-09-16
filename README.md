# Mock SMTP server for integration tests

You can run this mock SMTP server as a standalone Docker container or directly from JS or TS code

* [Building](#building)  
* [Releasing](#releasing) 
* [Using as a container](#using-as-a-container) 
* [Using from code](#using-from-code) 
* [Uing the HTTP API](#using-the-http-api)  


## Building

```bash
npm run docker:build
```

## Releasing

```bash
npm run release
```

## Using as a container

```bash
export LOGLEVEL="debug"
export HTTP_PORT="1080"
export SMTP_PORT="1025"
export SMTP_SECURE="true"
export SMTP_USER="username"
export SMTP_PASSWORD="password"
export MAX_MESSAGE_COUNT="100"
docker run -p 1025:1025 -p 1080:1080 gyszalai/mock-smtp:latest
```

Send e-mails and then query the messages: 

```bash
curl http://localhost:1080/messages
```

## Using from code

```ts
import fs from "node:fs"
import pino from "pino"
import createMockSmtpServer, { SmtpConfig } from "@gyszalai/mock-smtp"

const logger = pino({ level: "debug" })

const config: SmtpConfig = {
    port: 1025,
    username: "my_smtp_username",
    password: "my_smtp_password",
    secure: true,
    key: fs.readFileSync("smtp_key.pem"), // private key file in PEM or DER format
    cert: fs.readFileSync("smtp_cert.pem") // certificate file in PEM or DER format
}

const mockSmtpServer = createMockSmtpServer(logger, config, 100)
try {
    await mockSmtpServer.start()
    // send e-mails
    // ...
    // check if the e-mail messages are received via the message store API
    const messages = mockSmtpServer.getMessageStore().findMessages({ from: "someone@something.com" }, 1, true)
    if (messages[0].messageType === "myMessageType") {
        console.log("yay!")
    }
} finally {
    await mockSmtpServer.close()
}
```


## Using the HTTP API

### HEAD /

This endpoint simply returns HTTP 200 with the string `"ok"` in the response body. It can be used e.g. for healthcheck.

### GET /messages

Query messages that were received by the mock SMTP server. If you don't specify filter parameters, it returns all messages. 

#### Query parameters

You can specify filters via the following **query parameters:**

**`messageType`** value of the `x-message-type` MIME header of the received message
  
**`from`** e-mail address of the sender

**`to`** an e-mail address of the TO list

**`cc`** an e-mail from the CC list

**`count`** the maximum number of messages to return

**`reverse`** return the messages in reverse order, i.e. the latest message is the first in the list


#### Messages response

The messages HTTP API response is always a JSON array that contains `Message` objects with the following properties:

**`messageId`** [optional, string]
value of the `message-id` header, if present

**`messageType`** [optional, string]
  value of the `x-message-type` header, if present

**`from`** [EmailAddress object]
  - **`address`** the e-mail address of the sender 
  - **`name`** the name of the sender 

**`to`** [optional, array of EmailAddress objects]
  - **`address`** the e-mail address of the addressee 
  - **`name`** the name of the addressee

**`cc`** [optional, array of EmailAddress objects]
  - **`address`** the e-mail address of the CC addressee 
  - **`name`** the name of the CC addressee

**`subject`** [optional, string]
  The subject of the e-mail message

**`html`** [optional, string or boolean]
  The HTML message body or `false` if it's a plain text message

**`text`** [optional, string or boolean]
The plain text message body 

**`headers`** [object<string, any>]
MIME headers as a map with string keys and different value types

**`attachments`** [optional, array of Attachment objects]
[Mailparser Attachment object](https://nodemailer.com/extras/mailparser/#attachment-object)
  - **`filename`** [optional] file name of the attachment
  - **`contentType`** MIME type of the message
  - **`contentDisposition`** content disposition type for the attachment, most probably “attachment”
  - **`checksum`** a MD5 hash of the message content
  - **`size`** message size in bytes
  - **`headers`** a Map value that holds MIME headers for the attachment node
  - **`content`** a Buffer that contains the attachment contents
  - **`contentId`** the header value from ‘Content-ID’ (if present)
  - **`cid`** contentId without < and >
  - **`related`** if true then this attachment should not be offered for download (at least not in the main attachments list)

**Example:**

```json
{
    "messageId": "my_message_id1",
    "messageType": "myMessageType1",
    "headers": {
        "x-message-type": "myMessageType1",
        "from": {
            "value": [{ "address": "sender.name1@somedomain.xyz", "name": "Sender Name 1" }],
            "html": "<span class=\"mp_address_group\"><span class=\"mp_address_name\">Sender Name 1</span> &lt;<a href=\"mailto:sender.name1@somedomain.xyz\" class=\"mp_address_email\">sender.name1@somedomain.xyz</a>&gt;</span>",
            "text": "\"Sender Name 1\" <sender.name1@somedomain.xyz>"
        },
        "to": {
            "value": [{ "address": "receiver.name1@somedomain.xyz", "name": "Receiver Name 1" }],
            "html": "<span class=\"mp_address_group\"><span class=\"mp_address_name\">Receiver Name 1</span> &lt;<a href=\"mailto:receiver.name1@somedomain.xyz\" class=\"mp_address_email\">receiver.name1@somedomain.xyz</a>&gt;</span>",
            "text": "\"Receiver Name 1\" <receiver.name1@somedomain.xyz>"
        },
        "cc": {
            "value": [{ "address": "cc.name1@somedomain.xyz", "name": "CC Name 1" }],
            "html": "<span class=\"mp_address_group\"><span class=\"mp_address_name\">CC Name 1</span> &lt;<a href=\"mailto:cc.name1@somedomain.xyz\" class=\"mp_address_email\">cc.name1@somedomain.xyz</a>&gt;</span>",
            "text": "\"CC Name 1\" <cc.name1@somedomain.xyz>"
        },
        "subject": "Some subject 1",
        "message-id": "<my_message_id1>",
        "content-transfer-encoding": "7bit",
        "date": "2024-09-16T13:05:23.000Z",
        "mime-version": "1.0",
        "content-type": { "value": "text/plain", "params": { "charset": "utf-8" } }
    },
    "from": { "address": "sender.name1@somedomain.xyz", "name": "Sender Name 1" },
    "to": [{ "address": "receiver.name1@somedomain.xyz", "name": "Receiver Name 1" }],
    "cc": [{ "address": "cc.name1@somedomain.xyz", "name": "CC Name 1" }],
    "subject": "Some subject 1",
    "html": "<p>This is the message body as HTML</p>",
    "text": "This is the message body",
    "attachments": [
        {
            "type": "attachment",
            "content": { "type": "Buffer", "data": [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 33] },
            "contentType": "text/plain",
            "partId": "2",
            "release": null,
            "contentDisposition": "attachment",
            "filename": "text1.txt",
            "headers": {},
            "checksum": "fc3ff98e8c6a0d3087d515c0473f8677",
            "size": 12
        }
    ]
}
```


### DELETE /messages

Delete all messages.