import { RoleAssignment } from "../models/roleAssignment.model.js";
import { ActionRequest } from "../models/actionRequest.model.js";
import { Membership } from "../models/membership.model.js";
import { User } from "../models/user.model.js";
import { writeAuditLog } from "../services/audit.service.js";

export async function assignMonitor(req, res) {
  const { userId, groupId } = req.body;
  await RoleAssignment.create({ userId, groupId, assignedBy: req.user.sub });
  await User.findByIdAndUpdate(userId, { role: "chat_monitor" });
  await writeAuditLog(req.user.sub, "monitor:assign", "Group", groupId, { userId });
  return res.status(201).json({ message: "Monitor assigned" });
}

export async function createActionRequest(req, res) {
  const { groupId, action, targetUserId } = req.body;
  const request = await ActionRequest.create({
    requestedBy: req.user.sub,
    groupId,
    action,
    targetUserId,
  });
  return res.status(201).json({ request });
}

export async function reviewActionRequest(req, res) {
  const { requestId, decision } = req.body; // decision: "approved" | "rejected"
  const request = await ActionRequest.findById(requestId);
  if (!request || request.status !== "pending") {
    return res.status(404).json({ error: "Request not found or already reviewed" });
  }

  request.status = decision;
  request.reviewedBy = req.user.sub;
  await request.save();

  if (decision === "approved") {
    if (request.action === "add_member") {
      await Membership.create({ userId: request.targetUserId, groupId: request.groupId }).catch(() => {});
    } else if (request.action === "remove_member" || request.action === "kick_member") {
      await Membership.deleteOne({ userId: request.targetUserId, groupId: request.groupId });
    } else if (request.action === "mute_user") {
      const minutes = req.body.muteDuration || 60;
      await User.findByIdAndUpdate(request.targetUserId, {
        status: "muted",
        mutedUntil: new Date(Date.now() + minutes * 60 * 1000),
      });
    }
  }

  await writeAuditLog(req.user.sub, `request:${decision}`, "ActionRequest", request._id, {});
  return res.status(200).json({ request });
}

export async function listPendingRequests(req, res) {
  const requests = await ActionRequest.find({ status: "pending" })
    .populate("requestedBy", "anonymousName")
    .populate("targetUserId", "anonymousName");
  return res.status(200).json({ requests });
}