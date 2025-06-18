"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const client_1 = require("../prisma/app/generated/prisma/client");
const kafka = new kafkajs_1.Kafka({
    clientId: "ghost-date",
    brokers: ["localhost:9092"],
});
const KAFKA_TOPIC = "ghost-message-events";
const prismaClient = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const consumer = kafka.consumer({ groupId: "ghost-group" });
        yield consumer.connect();
        yield consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });
        yield consumer.run({
            autoCommit: false,
            eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ topic, partition, message }) {
                if (!message.value.toString()) {
                    return;
                }
                const parsedData = JSON.parse(message.value.toString());
                try {
                    const msg = yield prismaClient.message.create({
                        data: {
                            message: parsedData.message,
                            message_to_user: parsedData.message_to_user,
                            message_from_user: parsedData.message_from_user,
                            created_at: new Date(parsedData.created_at),
                        },
                    });
                    console.log(msg);
                    console.log("done");
                }
                catch (err) {
                    console.log(err);
                }
                yield consumer.commitOffsets([
                    {
                        topic: KAFKA_TOPIC,
                        partition: partition,
                        offset: (parseInt(message.offset) + 1).toString(),
                    },
                ]);
            }),
        });
    });
}
main();
