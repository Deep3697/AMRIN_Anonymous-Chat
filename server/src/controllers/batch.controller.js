import { Batch } from "../models/batch.model.js";
import { Group } from "../models/group.model.js";
import { User } from "../models/user.model.js";
import { Membership } from "../models/membership.model.js";
import { writeAuditLog } from "../services/audit.service.js";

export async function createBatch(req, res) {
  try {
    const { label, branch, institute, admissionYear } = req.body;

    const batch = await Batch.create({
      label: label.toUpperCase(),
      branch,
      institute,
      admissionYear,
      createdBy: req.user.sub,
    });

    const defaultTypes = ["casual", "doubt", "opportunity", "promotion"];
    const groupNames = { casual: "Casual", doubt: "Doubt-Box", opportunity: "Opportunities", promotion: "Promotions" };

    await Group.insertMany(
      defaultTypes.map((type) => ({
        name: `${batch.label}-${groupNames[type]}`,
        type,
        batchId: batch._id,
        isDefault: true,
        createdBy: req.user.sub,
      }))
    );

    await writeAuditLog(req.user.sub, "batch:create", "Batch", batch._id, { label: batch.label });

    return res.status(201).json({ batch });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}



export async function getUnassignedUsers(req, res) {
  const users = await User.find({ batchId: null }).select("email anonymousName");
  return res.status(200).json({ users });
}



export async function assignUsersToBatch(req, res) {
  try {
    const { batchId, userIds } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    await User.updateMany(
      { _id: { $in: userIds } },
      { batchId: batch._id, batchLabel: batch.label, branch: batch.branch, institute: batch.institute }
    );

    const batchGroups = await Group.find({ batchId: batch._id, division: null });

    const memberships = [];
    for (const userId of userIds) {
      for (const group of batchGroups) {
        memberships.push({ userId, groupId: group._id });
      }
    }
    await Membership.insertMany(memberships, { ordered: false }).catch(() => {}); // ignore duplicate-key errors

    return res.status(200).json({ message: "Users assigned" });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}