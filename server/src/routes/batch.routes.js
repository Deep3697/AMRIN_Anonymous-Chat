import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  createBatch,
  getAllBatches,
  getUnassignedUsers,
  assignUsersToBatch,
  getUsersWithoutInstitute,
  assignUsersToInstitute,
  getUsersWithoutBranch,
  assignUsersToBranch,
  getUsersWithoutDivision,
  assignUsersToDivision,
  getUsersByBatch,
  getDistinctInstitutes,
  getDistinctBranches,
} from "../controllers/batch.controller.js";

const adminOnly = [requireAuth, requireRole("god_admin", "main_admin")];

const router = express.Router();

// Batch CRUD
router.post("/", ...adminOnly, createBatch);
router.get("/", ...adminOnly, getAllBatches);

// Phase 1: unassigned → batch
router.get("/unassigned-users", ...adminOnly, getUnassignedUsers);
router.post("/assign-users", ...adminOnly, assignUsersToBatch);

// Phase 2: batch → institute
router.get("/:batchId/without-institute", ...adminOnly, getUsersWithoutInstitute);
router.post("/assign-institute", ...adminOnly, assignUsersToInstitute);

// Phase 3: institute → branch
router.get("/:batchId/:institute/without-branch", ...adminOnly, getUsersWithoutBranch);
router.post("/assign-branch", ...adminOnly, assignUsersToBranch);

// Phase 4: branch → division
router.get("/:batchId/:institute/:branch/without-division", ...adminOnly, getUsersWithoutDivision);
router.post("/assign-division", ...adminOnly, assignUsersToDivision);

// Dashboard helpers
router.get("/dashboard/by-batch", ...adminOnly, getUsersByBatch);
router.get("/:batchId/institutes", ...adminOnly, getDistinctInstitutes);
router.get("/:batchId/:institute/branches", ...adminOnly, getDistinctBranches);

export default router;