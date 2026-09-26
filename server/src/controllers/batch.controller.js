import { Batch } from "../models/batch.model.js";
import { Group } from "../models/group.model.js";
import { User } from "../models/user.model.js";
import { Membership } from "../models/membership.model.js";
import { writeAuditLog } from "../services/audit.service.js";

// ─── Helper: group type config ──────────────────────────────────────
const FOUR_GROUP_TYPES = ["casual", "doubt", "opportunity", "promotion"];
const GROUP_DISPLAY = {
  casual: "Casual",
  doubt: "Doubt-Box",
  opportunity: "Opportunities",
  promotion: "Promotions",
};

// ─── Helper: create groups at a hierarchy level if they don't exist ─
async function ensureGroups({ names, types, level, batchId, institute, branch, division, createdBy }) {
  for (let i = 0; i < names.length; i++) {
    const existing = await Group.findOne({ name: names[i] });
    if (!existing) {
      await Group.create({
        name: names[i],
        type: types[i],
        level,
        batchId: batchId || null,
        institute: institute || null,
        branch: branch || null,
        division: division || null,
        isDefault: true,
        createdBy,
      });
    }
  }
}

// ─── Helper: join a user to all groups matching a query ─────────────
async function joinUserToGroups(userId, groupQuery) {
  const groups = await Group.find(groupQuery);
  const memberships = groups.map((g) => ({ userId, groupId: g._id }));
  if (memberships.length > 0) {
    await Membership.insertMany(memberships, { ordered: false }).catch(() => {});
  }
}

// =====================================================================
//  PHASE 0: Batch CRUD
// =====================================================================

export async function createBatch(req, res) {
  try {
    const { label, admissionYear } = req.body;

    const batch = await Batch.create({
      label: label.toUpperCase(),
      admissionYear,
      createdBy: req.user.sub,
    });

    // Create batch-level groups (all 4 types)
    const names = FOUR_GROUP_TYPES.map((t) => `${batch.label}-${GROUP_DISPLAY[t]}`);
    await ensureGroups({
      names,
      types: FOUR_GROUP_TYPES,
      level: "batch",
      batchId: batch._id,
      createdBy: req.user.sub,
    });

    await writeAuditLog(req.user.sub, "batch:create", "Batch", batch._id, { label: batch.label });

    return res.status(201).json({ batch });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function getAllBatches(req, res) {
  try {
    const batches = await Batch.find({ isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ batches });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// =====================================================================
//  PHASE 1: Assign unassigned users → Batch
// =====================================================================

export async function getUnassignedUsers(req, res) {
  try {
    const users = await User.find({
      batchId: null,
      role: { $nin: ["god_admin", "main_admin"] },
    }).select("email anonymousName");
    return res.status(200).json({ users });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function assignUsersToBatch(req, res) {
  try {
    const { batchId, userIds } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Update user documents — set batchId and batchLabel only
    await User.updateMany(
      { _id: { $in: userIds }, role: { $nin: ["god_admin", "main_admin"] } },
      { batchId: batch._id, batchLabel: batch.label }
    );

    // Join them to all batch-level groups
    for (const userId of userIds) {
      await joinUserToGroups(userId, { batchId: batch._id, level: "batch" });
    }

    return res.status(200).json({ message: "Users assigned to batch" });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// =====================================================================
//  PHASE 2: Assign batch users → Institute
// =====================================================================

// Users who have a batch but no institute yet
export async function getUsersWithoutInstitute(req, res) {
  try {
    const { batchId } = req.params;
    const users = await User.find({
      batchId,
      institute: null,
      role: { $nin: ["god_admin", "main_admin"] },
    }).select("email anonymousName batchLabel");
    return res.status(200).json({ users });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function assignUsersToInstitute(req, res) {
  try {
    const { batchId, userIds, institute } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Ensure institute-level groups exist (all 4 types)
    const prefix = `${batch.label}-${institute}`;
    const names = FOUR_GROUP_TYPES.map((t) => `${prefix}-${GROUP_DISPLAY[t]}`);
    await ensureGroups({
      names,
      types: FOUR_GROUP_TYPES,
      level: "institute",
      batchId: batch._id,
      institute,
      createdBy: req.user.sub,
    });

    // Update user documents
    await User.updateMany(
      { _id: { $in: userIds }, role: { $nin: ["god_admin", "main_admin"] } },
      { institute }
    );

    // Join them to all institute-level groups for this batch+institute
    for (const userId of userIds) {
      await joinUserToGroups(userId, { batchId: batch._id, institute, level: "institute" });
    }

    return res.status(200).json({ message: "Users assigned to institute" });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// =====================================================================
//  PHASE 3: Assign institute users → Branch
// =====================================================================

// Users who have batch + institute but no branch yet
export async function getUsersWithoutBranch(req, res) {
  try {
    const { batchId, institute } = req.params;
    const users = await User.find({
      batchId,
      institute,
      branch: null,
      role: { $nin: ["god_admin", "main_admin"] },
    }).select("email anonymousName batchLabel institute");
    return res.status(200).json({ users });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function assignUsersToBranch(req, res) {
  try {
    const { batchId, institute, userIds, branch } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Ensure branch-level groups exist (all 4 types)
    const prefix = `${batch.label}-${institute}-${branch}`;
    const names = FOUR_GROUP_TYPES.map((t) => `${prefix}-${GROUP_DISPLAY[t]}`);
    await ensureGroups({
      names,
      types: FOUR_GROUP_TYPES,
      level: "branch",
      batchId: batch._id,
      institute,
      branch,
      createdBy: req.user.sub,
    });

    // Update user documents
    await User.updateMany(
      { _id: { $in: userIds }, role: { $nin: ["god_admin", "main_admin"] } },
      { branch }
    );

    // Join them to all branch-level groups
    for (const userId of userIds) {
      await joinUserToGroups(userId, { batchId: batch._id, institute, branch, level: "branch" });
    }

    return res.status(200).json({ message: "Users assigned to branch" });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// =====================================================================
//  PHASE 4: Assign branch users → Division
// =====================================================================

// Users who have batch + institute + branch but no division yet
export async function getUsersWithoutDivision(req, res) {
  try {
    const { batchId, institute, branch } = req.params;
    const users = await User.find({
      batchId,
      institute,
      branch,
      division: null,
      role: { $nin: ["god_admin", "main_admin"] },
    }).select("email anonymousName batchLabel institute branch");
    return res.status(200).json({ users });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function assignUsersToDivision(req, res) {
  try {
    const { batchId, institute, branch, userIds, division } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Ensure division-level group exists (only 1 casual group)
    const divGroupName = `${batch.label}-${institute}-${branch}-${division}`;
    await ensureGroups({
      names: [divGroupName],
      types: ["casual"],
      level: "division",
      batchId: batch._id,
      institute,
      branch,
      division,
      createdBy: req.user.sub,
    });

    // Update user documents
    await User.updateMany(
      { _id: { $in: userIds }, role: { $nin: ["god_admin", "main_admin"] } },
      { division }
    );

    // Join them to the division group
    for (const userId of userIds) {
      await joinUserToGroups(userId, { batchId: batch._id, institute, branch, division, level: "division" });
    }

    return res.status(200).json({ message: "Users assigned to division" });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// =====================================================================
//  Dashboard helpers: get distinct values for the phase selectors
// =====================================================================

// All users grouped by batch (for admin dashboard overview)
export async function getUsersByBatch(req, res) {
  try {
    const batches = await Batch.find({ isActive: true }).sort({ createdAt: -1 });
    const result = [];
    for (const batch of batches) {
      const users = await User.find({
        batchId: batch._id,
        role: { $nin: ["god_admin", "main_admin"] },
      }).select("email anonymousName institute branch division");
      result.push({ batch, users });
    }
    return res.status(200).json({ batchGroups: result });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// Get distinct institutes within a batch
export async function getDistinctInstitutes(req, res) {
  try {
    const { batchId } = req.params;
    const institutes = await User.distinct("institute", {
      batchId,
      institute: { $ne: null },
      role: { $nin: ["god_admin", "main_admin"] },
    });
    return res.status(200).json({ institutes });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// Get distinct branches within a batch + institute
export async function getDistinctBranches(req, res) {
  try {
    const { batchId, institute } = req.params;
    const branches = await User.distinct("branch", {
      batchId,
      institute,
      branch: { $ne: null },
      role: { $nin: ["god_admin", "main_admin"] },
    });
    return res.status(200).json({ branches });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}