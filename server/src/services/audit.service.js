import { AuditLog } from "../models/auditLog.model.js";

export async function writeAuditLog(actorId, action, targetType, targetId, details = {}) {
  await AuditLog.create({ actorId, action, targetType, targetId, details });
}