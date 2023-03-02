openssl genrsa -out rootCA.privkey.pem 2048
openssl req -x509 -new -nodes -key rootCA.privkey.pem -sha256 -days 1024 -out rootCA.cert.pem -subj "/C=HU/ST=Budapest/L=/O=DUMMYSMTP/OU=/CN=Root CA"

openssl genrsa -out smtp.server.privkey.pem 2048
openssl req -new -key smtp.server.privkey.pem -out smtp.server.csr -subj "/C=HU/ST=Budapest/L=/O=DUMMYSMTP/OU=SMTP/CN=Server cert"
openssl x509 -req -in smtp.server.csr -CA rootCA.cert.pem -CAkey rootCA.privkey.pem -CAcreateserial -out smtp.server.cert.pem -days 5000 -sha256
