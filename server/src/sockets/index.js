import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { registerMessageHandlers } from "./handlers/message.handler.js";

export function initSocket(io) {
    io.use((socket, next) => {
        try {
            const rawCookie = socket.handshake.headers.cookie || "";
            const parseFn = cookie.parseCookie || cookie.parse;
            const cookies = parseFn ? parseFn(rawCookie) : {};
            const token = cookies.accessToken;
            if (!token) return next(new Error("Not authenticated"));
            socket.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            next();
        } catch (err) {
            console.error("Socket authentication error:", err.message);
            next(new Error("Not authenticated"));
        }
    });

    io.on("connection", (socket) => {
        registerMessageHandlers(io, socket);
    });
}