import express from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware.js";
import { getAdminStats } from "../controllers/adminStats.controller.js";

const router = express.Router();
router.get("/stats", requireAuth, requireAdmin, getAdminStats);

export default router;
