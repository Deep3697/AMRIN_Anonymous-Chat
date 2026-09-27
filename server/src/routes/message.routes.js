import express from "express";
import { getMessages } from "../controllers/message.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getSeenBy } from "../controllers/message.controller.js";

const router = express.Router();
router.get("/:groupId", requireAuth, getMessages);
router.get("/:messageId/seen-by", requireAuth, getSeenBy);

export default router;