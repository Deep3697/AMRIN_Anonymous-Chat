import { Message } from "../../models/message.model.js";
import { User } from "../../models/user.model.js";

export function registerMessageHandlers(io, socket) {
  socket.on("group:join", (groupId) => {
    socket.join(groupId);
  });

  socket.on("message:send", async ({ groupId, text }) => {
    try {
      const user = await User.findById(socket.user.sub);
      const message = await Message.create({
        threadId: groupId,
        threadType: "group",
        senderId: user._id,
        anonymousNameSnapshot: user.anonymousName,
        text,
        type: "user",
      });
      io.to(groupId).emit("message:new", message);
    } catch (err) {
      console.error("❌ message:send ERROR:", err);
      socket.emit("message:error", { error: err.message });
    }
  });
}