import express from "express";
import { createBatch } from "../controllers/batch.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { getUnassignedUsers } from "../controllers/batch.controller.js";

const router = express.Router();
router.post("/", requireAuth, requireRole("god_admin"), createBatch);
router.get("/unassigned-users", requireAuth, requireRole("god_admin", "main_admin"), getUnassignedUsers);
export default router;