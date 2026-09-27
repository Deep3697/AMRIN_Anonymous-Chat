import express from "express";
import { createReport, listReports, reviewReport } from "../controllers/report.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();
router.post("/", requireAuth, createReport);
router.get("/", requireAuth, requireRole("god_admin", "main_admin"), listReports);
router.post("/review", requireAuth, requireRole("god_admin", "main_admin"), reviewReport);
export default router;
