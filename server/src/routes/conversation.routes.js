import express from "express";
import { startConversation, getMyConversations, searchUsers, markConversationRead } from "../controllers/conversation.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.post("/start", requireAuth, startConversation);
router.get("/my-conversations", requireAuth, getMyConversations);
router.get("/search-users", requireAuth, searchUsers);
router.patch("/:convoId/read", requireAuth, markConversationRead);

export default router;