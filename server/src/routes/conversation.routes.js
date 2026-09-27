import express from "express";
import { startConversation, getMyConversations, searchUsers } from "../controllers/conversation.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.post("/start", requireAuth, startConversation);
router.get("/my-conversations", requireAuth, getMyConversations);
router.get("/search-users", requireAuth, searchUsers);
export default router;