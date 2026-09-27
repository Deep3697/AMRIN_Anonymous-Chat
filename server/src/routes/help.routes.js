import express from "express";
import { sendHelpMessage, getMyHelpThread } from "../controllers/help.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.post("/send", requireAuth, sendHelpMessage);
router.get("/my-thread", requireAuth, getMyHelpThread);
export default router;