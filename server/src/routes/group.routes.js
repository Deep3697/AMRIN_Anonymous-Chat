import express from "express";
import { getMyGroups, markAsRead } from "../controllers/group.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/my-groups", requireAuth, getMyGroups);
router.patch("/:groupId/read", requireAuth, markAsRead);

export default router;