import express from "express";
import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { Kafka } from "kafkajs";
import { generateUSerID } from "./utils/genRoomId";

const kafka = new Kafka({
  clientId: "ghost-date",
  brokers: ["kafka:9093"],
  retry: {
    retries: 10,
  },
});

const KAFKA_TOPIC = "ghost-message-events";

const producer = kafka.producer();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const chatRooms = new Map<WebSocket, string>();

wss.on("connection", async (ws, req) => {
  console.log("client connected to websocket");
  await producer.connect();
  await new Promise((res) => setTimeout(res, 2000));

  ws.on("message", async (message) => {
    const data = JSON.parse(message.toString());
    if (data.type === "roomID") {
      const roomID = generateUSerID(data.loggedInUserId, data.recieverUserId);
      chatRooms.set(ws, roomID);
    }

    if (data.type === "message") {
      const roomId = chatRooms.get(ws);
      const message = JSON.stringify({
        id: data.id,
        type: data.type,
        message_to_user: data.message_to_user,
        message_from_user: data.message_from_user,
        message: data.message,
        created_at: new Date(),
      });

      producer.send({
        topic: KAFKA_TOPIC,
        messages: [{ value: message }],
      });
      console.log("added to queue");

      wss.clients.forEach((client) => {
        if (
          chatRooms.get(client) === roomId &&
          client.readyState === WebSocket.OPEN
        ) {
          client.send(message);
        }
      });
    }
  });
});

const PORT = 8080;

app.get("/health", async (req, res) => {
  try {
    await producer.connect();
    res.status(200).send("OK");
  } catch (err) {
    res.status(500).send("Kafka producer not connected");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`websocket server is running on port ${PORT}`);
});
