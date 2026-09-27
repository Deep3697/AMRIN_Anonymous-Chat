import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { registerMessageHandlers } from "./handlers/message.handler.js";

import { Membership } from "../models/membership.model.js";
import { Conversation } from "../models/conversation.model.js";

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

    io.on("connection", async (socket) => {
        try {
            if (["god_admin", "main_admin"].includes(socket.user.role)) {
                const { Group } = await import("../models/group.model.js");
                const allGroups = await Group.find({}, "_id");
                allGroups.forEach(g => socket.join(g._id.toString()));
            } else {
                const memberships = await Membership.find({ userId: socket.user.sub });
                memberships.forEach(m => socket.join(m.groupId.toString()));
            }
            
            const convos = await Conversation.find({ participants: socket.user.sub });
            convos.forEach(c => socket.join(c._id.toString()));
        } catch (err) {
            console.error("Failed to join rooms:", err);
        }

        registerMessageHandlers(io, socket);
    });
}