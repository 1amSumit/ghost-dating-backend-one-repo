FROM node:22-alpine

WORKDIR /app

COPY package* .

RUN npm install

COPY . .

RUN npx prisma generate


CMD [ "npm", "run", "dev" ]