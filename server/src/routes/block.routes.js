import express from "express";
import { blockUser, unblockUser, getBlockList } from "../controllers/block.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.post("/", requireAuth, blockUser);
router.delete("/:userId", requireAuth, unblockUser);
router.get("/list", requireAuth, getBlockList);
export default router;
