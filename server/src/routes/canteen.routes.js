import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { listCanteens, submitVote, createCanteen } from "../controllers/canteen.controller.js";

const adminOnly = [requireAuth, requireRole("god_admin", "main_admin")];
const router = express.Router();

router.get("/", requireAuth, listCanteens);
router.post("/vote", requireAuth, submitVote);
router.post("/", ...adminOnly, createCanteen);

export default router;