import express from "express";
import { sendHelpMessage, getMyHelpThread, getAllHelpThreads, replyHelpThread, resolveHelpThread } from "../controllers/help.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();
router.post("/send", requireAuth, sendHelpMessage);
router.get("/my-thread", requireAuth, getMyHelpThread);

const adminOnly = [requireAuth, requireRole("god_admin", "main_admin")];
router.get("/all", ...adminOnly, getAllHelpThreads);
router.post("/:threadId/reply", ...adminOnly, replyHelpThread);
router.post("/:threadId/resolve", ...adminOnly, resolveHelpThread);

export default router;