import express from "express";
import {
  assignMonitor,
  createActionRequest,
  reviewActionRequest,
  listPendingRequests,
} from "../controllers/monitor.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();
router.post("/assign", requireAuth, requireRole("god_admin", "main_admin"), assignMonitor);
router.post("/requests", requireAuth, requireRole("chat_monitor"), createActionRequest);
router.get("/requests", requireAuth, requireRole("god_admin", "main_admin"), listPendingRequests);
router.post("/requests/review", requireAuth, requireRole("god_admin", "main_admin"), reviewActionRequest);
export default router;