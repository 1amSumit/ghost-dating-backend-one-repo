import { Kafka } from "kafkajs";
import { PrismaClient } from "../prisma/app/generated/prisma/client";
const kafka = new Kafka({
  clientId: "ghost-date",
  brokers: ["localhost:9092"],
});

const KAFKA_TOPIC = "ghost-message-events";

const prismaClient = new PrismaClient();

async function main() {
  const consumer = kafka.consumer({ groupId: "ghost-group" });
  await consumer.connect();

  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value.toString()) {
        return;
      }
      const parsedData = JSON.parse(message.value.toString());

      try {
        const msg = await prismaClient.message.create({
          data: {
            message: parsedData.message,
            message_to_user: parsedData.message_to_user,
            message_from_user: parsedData.message_from_user,
            created_at: new Date(parsedData.created_at),
          },
        });
        console.log(msg);
        console.log("done");
      } catch (err) {
        console.log(err);
      }

      await consumer.commitOffsets([
        {
          topic: KAFKA_TOPIC,
          partition: partition,
          offset: (parseInt(message.offset) + 1).toString(),
        },
      ]);
    },
  });
}

main();
