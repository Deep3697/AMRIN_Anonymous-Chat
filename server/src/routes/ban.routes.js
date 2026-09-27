import express from "express";
import { banUser, revokeBan, listBannedUsers, searchUsersForBan } from "../controllers/ban.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();
router.post("/", requireAuth, requireRole("god_admin", "main_admin"), banUser);
router.post("/revoke/:banId", requireAuth, requireRole("god_admin"), revokeBan);
router.get("/list", requireAuth, requireRole("god_admin", "main_admin"), listBannedUsers);
router.get("/search-users", requireAuth, requireRole("god_admin", "main_admin"), searchUsersForBan);
export default router;
