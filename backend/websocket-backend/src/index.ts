import  { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ClientManager } from "./ClientManager.js";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
interface DecodedToken {
    id: string;
}
// WebSocket server
const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket backend is up");

wss.on('connection', (ws, request) => {
    const url = request.url;
    if (!url) {
        ws.close();
        return;
    }

    const queryParams = new URLSearchParams(url.split('?')[1]);
    let token = queryParams.get('token') ?? "";

    // Strip "Bearer " if present
    if (token.startsWith("Bearer ")) {
        token = token.slice(7);
    }

    let decoded: DecodedToken;
    try {
        decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    } catch (err) {
        console.error("Invalid token", err);
        ws.close();
        return;
    }

    if (!decoded?.id) {
        ws.close();
        return;
    }

    console.log("New client connected:", decoded.id);
    const client = new ClientManager(ws, decoded.id);
    client.setNode();
});
console.log("WebSocket server running on ws://localhost:8080");
