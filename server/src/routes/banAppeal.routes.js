import express from "express";
import { submitAppeal, listAppeals, reviewAppeal, getMyAppealStatus } from "../controllers/banAppeal.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();
router.post("/submit", requireAuth, submitAppeal);
router.get("/my-status", requireAuth, getMyAppealStatus);
router.get("/list", requireAuth, requireRole("god_admin"), listAppeals);
router.post("/review/:appealId", requireAuth, requireRole("god_admin"), reviewAppeal);
export default router;
