FROM node:22-alpine

WORKDIR /app


RUN apk --no-cache add curl

COPY package* .

RUN npm install

COPY . .

EXPOSE 8080

CMD [ "npm", "run", "dev" ]