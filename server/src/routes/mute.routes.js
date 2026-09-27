import express from "express";
import { listMutedUsers, unmuteUser } from "../controllers/mute.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();
router.get("/list", requireAuth, requireRole("god_admin", "main_admin"), listMutedUsers);
router.post("/unmute/:userId", requireAuth, requireRole("god_admin", "main_admin"), unmuteUser);
export default router;
