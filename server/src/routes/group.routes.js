import express from "express";
import { getMyGroups } from "../controllers/group.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/my-groups", requireAuth, getMyGroups);
export default router;