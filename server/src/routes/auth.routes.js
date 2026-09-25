import express from "express";
import {
  register,
  verifyOtpHandler,
  completeProfile,
  login,
  session,
  logout,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtpHandler);
router.post("/complete-profile", completeProfile);
router.post("/login", login);
router.get("/session", session);
router.post("/logout", logout);

export default router;