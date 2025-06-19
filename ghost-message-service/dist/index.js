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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const kafkajs_1 = require("kafkajs");
const genRoomId_1 = require("./utils/genRoomId");
const kafka = new kafkajs_1.Kafka({
    clientId: "ghost-date",
    brokers: ["kafka:9092"],
});
const KAFKA_TOPIC = "ghost-message-events";
const producer = kafka.producer();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
const chatRooms = new Map();
wss.on("connection", (ws, req) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("client connected to websocket");
    yield producer.connect();
    ws.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        const data = JSON.parse(message.toString());
        if (data.type === "roomID") {
            const roomID = (0, genRoomId_1.generateUSerID)(data.loggedInUserId, data.recieverUserId);
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
                if (chatRooms.get(client) === roomId &&
                    client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    }));
}));
const PORT = 8080;
app.get("/health", (req, res) => {
    res.status(200).json({
        message: "server is up and running",
    });
});
server.listen(PORT, "0.0.0.0", () => {
    console.log(`websocker server is running on port ${PORT}`);
});
