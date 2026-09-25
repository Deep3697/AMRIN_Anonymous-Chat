import express from "express";
import { getMessages } from "../controllers/message.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/:groupId", requireAuth, getMessages);
export default router;