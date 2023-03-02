FROM node:18.14.2-alpine

RUN adduser -D -u 2000 -g 2000 app
RUN apk add --update openssl bash curl make g++ gcc && rm -rf /tmp/* /var/cache/apk/*

USER app
ENV HOME /home/app
WORKDIR /home/app

COPY package.json /home/app/
COPY package-lock.json /home/app/
RUN  npm ci --omit=dev
COPY dist /home/app/dist
COPY keys /home/app/keys

EXPOSE 1025 1080

CMD [ "node", "dist/index.js" ]
