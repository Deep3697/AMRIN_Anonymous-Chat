import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { registerMessageHandlers } from "./handlers/message.handler.js";

import { Membership } from "../models/membership.model.js";
import { Conversation } from "../models/conversation.model.js";

export function initSocket(io) {
    io.use(async (socket, next) => {
        try {
            const rawCookie = socket.handshake.headers.cookie || "";
            const parseFn = cookie.parseCookie || cookie.parse;
            const cookies = parseFn ? parseFn(rawCookie) : {};
            let userPayload = null;

            if (cookies.accessToken) {
                try {
                    userPayload = jwt.verify(cookies.accessToken, process.env.ACCESS_TOKEN_SECRET);
                } catch {
                    // Access token expired, attempt refresh token fallback below
                }
            }

            if (!userPayload && cookies.refreshToken) {
                try {
                    const refreshPayload = jwt.verify(cookies.refreshToken, process.env.REFRESH_TOKEN_SECRET);
                    const { User } = await import("../models/user.model.js");
                    const dbUser = await User.findById(refreshPayload.sub);
                    if (dbUser) {
                        userPayload = { sub: dbUser._id, role: dbUser.role };
                    }
                } catch {
                    // Refresh token invalid or expired
                }
            }

            if (!userPayload) {
                return next(new Error("Not authenticated"));
            }

            socket.user = userPayload;
            next();
        } catch (err) {
            console.error("Socket authentication error:", err.message);
            next(new Error("Not authenticated"));
        }
    });

    io.on("connection", async (socket) => {
        try {
            if (["god_admin", "main_admin"].includes(socket.user.role)) {
                socket.join("admins");
                const { Group } = await import("../models/group.model.js");
                const allGroups = await Group.find({}, "_id");
                allGroups.forEach(g => socket.join(g._id.toString()));
            } else {
                const memberships = await Membership.find({ userId: socket.user.sub });
                memberships.forEach(m => socket.join(m.groupId.toString()));
            }
            
            const convos = await Conversation.find({ participants: socket.user.sub });
            convos.forEach(c => socket.join(c._id.toString()));

            // Also join user's own room for reliable real-time direct delivery
            socket.join(socket.user.sub.toString());
        } catch (err) {
            console.error("Failed to join rooms:", err);
        }

        registerMessageHandlers(io, socket);
    });
}