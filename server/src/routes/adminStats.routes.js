import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { getAdminStats } from "../controllers/adminStats.controller.js";

const router = express.Router();
router.get("/stats", requireAuth, requireRole("god_admin", "main_admin"), getAdminStats);

export default router;
