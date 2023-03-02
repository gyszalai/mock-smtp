# Mock SMTP server for integration tests

## Building

```bash
npm run docker:build
```

## Releasing

```bash
npm run release
```

## Using

```bash
export LOGLEVEL="debug"
export HTTP_PORT="1080"
export SMTP_PORT="1025"
export SMTP_SECURE="true"
export SMTP_USER="username"
export SMTP_PASSWORD="password"
export MAX_MESSAGE_COUNT="100"
docker run -p 1025:1025 -p 1080:1080 gyszalai/smtp-mock:latest
```

