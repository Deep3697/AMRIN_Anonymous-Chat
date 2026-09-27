import { Message } from "../../models/message.model.js";
import { User } from "../../models/user.model.js";
import { Group } from "../../models/group.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { Membership } from "../../models/membership.model.js";
import { RoleAssignment } from "../../models/roleAssignment.model.js";
import { Block } from "../../models/block.model.js";
import { isClean, isMuted, recordOffence } from "../../services/moderation.service.js";
import { getEmbedding, isDuplicate } from "../../services/duplicate.service.js";
import { extractDeadline } from "../../services/deadline.service.js";
import { isSpamming } from "../../services/rateLimit.service.js";

// Map roles to display names for group chat
function getAdminDisplayName(role) {
  if (role === "god_admin") return "God_Admin";
  if (role === "main_admin") return "Admin";
  return null;
}

export function registerMessageHandlers(io, socket) {
  socket.on("group:join", (threadId) => socket.join(threadId));

  // ── Send a message (supports optimistic UI via tempId) ──
  socket.on("message:send", async ({ threadId, threadType, text, attachment, tempId }) => {
    try {
      if (isSpamming(socket.user.sub)) {
        return socket.emit("message:error", { error: "You're sending messages too fast", tempId });
      }

      const user = await User.findById(socket.user.sub);

      // Check if user is banned
      if (user.status === "banned" && user.bannedUntil && user.bannedUntil > new Date()) {
        return socket.emit("message:error", { error: "You are banned until " + user.bannedUntil, tempId });
      }

      if (await isMuted(user)) {
        return socket.emit("message:error", { error: "You are muted until " + user.mutedUntil, tempId });
      }

      // Check block in DMs
      if (threadType === "dm") {
        const convo = await Conversation.findById(threadId);
        if (convo) {
          const otherUserId = convo.participants.find(p => p.toString() !== socket.user.sub);
          if (otherUserId) {
            const blocked = await Block.findOne({
              $or: [
                { blockerId: socket.user.sub, blockedId: otherUserId },
                { blockerId: otherUserId, blockedId: socket.user.sub },
              ]
            });
            if (blocked) {
              return socket.emit("message:error", { error: "Cannot send messages — user blocked", tempId });
            }
          }
        }
      }

      if (text && !isClean(text)) {
        await recordOffence(user._id, text);
        return socket.emit("message:error", { error: "Message blocked by moderation", tempId });
      }

      let embedding = [];
      let deadline = null;

      if (threadType === "group") {
        const group = await Group.findById(threadId);
        if (group && ["opportunity", "promotion"].includes(group.type) && text) {
          embedding = await getEmbedding(text);
          if (await isDuplicate(threadId, embedding)) {
            return socket.emit("message:error", { error: "This has already been posted recently", tempId });
          }
          deadline = extractDeadline(text);
        }
      }

      // Admin display name override: admins show as "God_Admin" / "Admin" in group chats only
      // In DMs, everyone is equal — always use real anonymousName
      let displayName = user.anonymousName;
      if (threadType === "group") {
        const adminDisplayName = getAdminDisplayName(user.role);
        displayName = adminDisplayName || user.anonymousName;
        if (user.role === "chat_monitor") displayName += "(monitor)";
      }

      const message = await Message.create({
        threadId,
        threadType,
        senderId: user._id,
        anonymousNameSnapshot: displayName,
        text: text || "",
        attachment: attachment || null,
        type: "user",
        embedding,
        meta: { deadline },
      });

      const Model = threadType === "dm" ? Conversation : Group;
      await Model.findByIdAndUpdate(threadId, {
        lastMessageAt: message.createdAt,
        lastMessageSnippet: text || `[${attachment?.type || "media"}]`,
      });

      // Echo tempId back so the sender can replace its optimistic placeholder
      const payload = message.toObject();
      if (tempId) payload.tempId = tempId;
      payload.threadId = threadId.toString();
      payload.senderId = user._id.toString();

      const threadIdStr = threadId.toString();

      if (threadType === "dm") {
        const convo = await Conversation.findById(threadId);
        let emitter = io.to(threadIdStr);
        if (convo && convo.participants) {
          convo.participants.forEach((p) => {
            emitter = emitter.to(p.toString());
          });
        }
        emitter.emit("message:new", payload);
      } else {
        io.to(threadIdStr).to("admins").emit("message:new", payload);
      }
    } catch {
      socket.emit("message:error", { error: "Failed to send message", tempId });
    }
  });

  // ── Edit (owner only, within 5 min) ──
  socket.on("message:edit", async ({ messageId, newText }) => {
    const message = await Message.findById(messageId);
    if (!message) return;
    const isOwner = message.senderId.toString() === socket.user.sub;
    const withinWindow = Date.now() - message.createdAt.getTime() < 5 * 60 * 1000;
    if (!isOwner || !withinWindow) {
      return socket.emit("message:error", { error: "Cannot edit this message" });
    }
    if (newText && !isClean(newText)) {
      return socket.emit("message:error", { error: "Edit blocked by moderation" });
    }
    message.text = newText;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    io.to(message.threadId.toString()).emit("message:updated", message);
  });

  // ── Delete (owner, monitors in their group, or admins — DMs: owner only) ──
  socket.on("message:delete", async ({ messageId }) => {
    const message = await Message.findById(messageId);
    if (!message) return;
    const isOwner = message.senderId.toString() === socket.user.sub;

    // In DMs, only the owner can delete their own message — no privileges
    if (message.threadType === "dm") {
      if (!isOwner) {
        return socket.emit("message:error", { error: "You can only delete your own messages in DMs" });
      }
    } else {
      const isAdmin = ["god_admin", "main_admin"].includes(socket.user.role);
      // Chat monitors can only delete in groups they are assigned to
      const isMonitorHere = socket.user.role === "chat_monitor"
        && await RoleAssignment.exists({ userId: socket.user.sub, groupId: message.threadId, isActive: true });

      if (!isOwner && !isAdmin && !isMonitorHere) {
        return socket.emit("message:error", { error: "Not authorized to delete" });
      }
    }
    message.isDeleted = true;

    // figure out deleter display name (in DMs, always use real name)
    const deleter = await User.findById(socket.user.sub);
    let deleterName = deleter ? deleter.anonymousName : "Unknown";
    if (message.threadType === "group") {
      if (socket.user.role === "god_admin") deleterName = "God_Admin";
      else if (socket.user.role === "main_admin") deleterName = "Admin";
      else if (socket.user.role === "chat_monitor") deleterName += "(monitor)";
    }

    message.deletedBySnapshot = deleterName;
    // Keep the original text in DB but clear it from broadcasts
    await message.save();
    // Send the updated message with isDeleted flag; client will show "This message was deleted"
    io.to(message.threadId.toString()).emit("message:updated", message);
  });

  // ── Read receipts (using $addToSet to prevent duplicates at DB level) ──
  socket.on("message:seen", async ({ messageId }) => {
    try {
      const result = await Message.findOneAndUpdate(
        {
          _id: messageId,
          "seenBy.userId": { $ne: socket.user.sub },
        },
        {
          $addToSet: { seenBy: { userId: socket.user.sub } },
        },
        { new: true }
      );
      if (result) {
        io.to(result.threadId.toString()).emit("message:seenUpdate", {
          messageId: result._id,
          seenCount: result.seenBy.length,
        });
      }
    } catch {
      // silently ignore seen errors
    }
  });

  // ── Mute a user (admins anywhere, monitors in assigned groups only) ──
  socket.on("user:mute", async ({ userId, groupId, durationMinutes = 60 }) => {
    const isAdmin = ["god_admin", "main_admin"].includes(socket.user.role);
    const isMonitorHere = !isAdmin
      && await RoleAssignment.exists({ userId: socket.user.sub, groupId, isActive: true });

    if (!isAdmin && !isMonitorHere) {
      return socket.emit("message:error", { error: "Not authorized to mute" });
    }
    const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await User.findByIdAndUpdate(userId, { status: "muted", mutedUntil });
    io.to(groupId).emit("user:mutedAlert", { userId, mutedUntil });
    socket.emit("user:actionSuccess", { action: "muted", userId, mutedUntil });
  });

  // ── Kick a user from a group (admins only) ──
  socket.on("user:kick", async ({ userId, groupId }) => {
    if (!["god_admin", "main_admin"].includes(socket.user.role)) {
      return socket.emit("message:error", { error: "Only admins can kick users" });
    }
    await Membership.deleteOne({ userId, groupId });
    io.to(groupId).emit("user:kicked", { userId });
    socket.emit("user:actionSuccess", { action: "kicked", userId });
  });

  // ── Promote/Demote monitor (admins only) ──
  socket.on("user:promote", async ({ userId, groupId }) => {
    if (!["god_admin", "main_admin"].includes(socket.user.role)) return;
    await RoleAssignment.updateOne(
      { userId, groupId },
      { userId, groupId, assignedBy: socket.user.sub, isActive: true },
      { upsert: true }
    );
    await User.findByIdAndUpdate(userId, { role: "chat_monitor" });
    socket.emit("user:actionSuccess", { action: "promoted", userId });
  });

  socket.on("user:demote", async ({ userId, groupId }) => {
    if (!["god_admin", "main_admin"].includes(socket.user.role)) return;
    await RoleAssignment.deleteOne({ userId, groupId });
    await User.findByIdAndUpdate(userId, { role: "member" });
    socket.emit("user:actionSuccess", { action: "demoted", userId });
  });

  // ── Create a poll ──
  socket.on("poll:create", async ({ threadId, threadType, question, options }) => {
    try {
      const user = await User.findById(socket.user.sub);
      const message = await Message.create({
        threadId,
        threadType,
        senderId: user._id,
        anonymousNameSnapshot: user.anonymousName,
        type: "poll",
        poll: { question, options: options.map((text) => ({ text, votes: [] })) },
      });
      io.to(threadId).emit("message:new", message);
    } catch {
      socket.emit("message:error", { error: "Failed to create poll" });
    }
  });

  // ── Vote on a poll (click again to remove your vote) ──
  socket.on("poll:vote", async ({ messageId, optionIndex }) => {
    const message = await Message.findById(messageId);
    if (!message || message.type !== "poll") return;

    const userId = socket.user.sub;
    if (!message.poll.allowMultiple) {
      message.poll.options.forEach((opt) => {
        opt.votes = opt.votes.filter((v) => v.toString() !== userId);
      });
    }
    const option = message.poll.options[optionIndex];
    const alreadyVoted = option.votes.some((v) => v.toString() === userId);
    option.votes = alreadyVoted
      ? option.votes.filter((v) => v.toString() !== userId)
      : [...option.votes, userId];

    await message.save();
    io.to(message.threadId.toString()).emit("message:updated", message);
  });


}