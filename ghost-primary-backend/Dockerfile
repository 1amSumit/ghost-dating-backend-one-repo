FROM node:22-alpine

WORKDIR /app

COPY package* . 
RUN npm install

COPY . .


RUN npx prisma generate

RUN npm run build

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]


EXPOSE 3000

