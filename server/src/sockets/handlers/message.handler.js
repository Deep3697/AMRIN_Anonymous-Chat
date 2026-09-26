import { Message } from "../../models/message.model.js";
import { User } from "../../models/user.model.js";
import { Group } from "../../models/group.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { isClean, isMuted, recordOffence } from "../../services/moderation.service.js";

export function registerMessageHandlers(io, socket) {
  socket.on("group:join", (threadId) => {
    socket.join(threadId);
  });

  socket.on("message:send", async ({ threadId, threadType, text }) => {
    try {
      const user = await User.findById(socket.user.sub);

      if (await isMuted(user)) {
        return socket.emit("message:error", { error: "You are muted until " + user.mutedUntil });
      }

      if (!isClean(text)) {
        await recordOffence(user._id, text);
        return socket.emit("message:error", { error: "Message blocked by moderation" });
      }

      const message = await Message.create({
        threadId,
        threadType,
        senderId: user._id,
        anonymousNameSnapshot: user.anonymousName,
        text,
        type: "user",
      });

      const Model = threadType === "dm" ? Conversation : Group;
      await Model.findByIdAndUpdate(threadId, {
        lastMessageAt: message.createdAt,
        lastMessageSnippet: text,
      });

      io.to(threadId).emit("message:new", message);
    } catch {
      socket.emit("message:error", { error: "Failed to send message" });
    }
  });
}