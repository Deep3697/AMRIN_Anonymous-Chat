import express from "express";
import { startConversation, getMyConversations } from "../controllers/conversation.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/start", requireAuth, startConversation);
router.get("/my-conversations", requireAuth, getMyConversations);
export default router;