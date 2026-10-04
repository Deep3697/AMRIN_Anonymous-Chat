import express from "express";
import {
  register,
  verifyOtpHandler,
  completeProfile,
  login,
  session,
  logout,
  forgotPasswordRequest,
  forgotPasswordVerifyOtp,
  forgotPasswordReset,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtpHandler);
router.post("/complete-profile", completeProfile);
router.post("/login", login);
router.get("/session", session);
router.post("/logout", logout);

// Forgot password flow
router.post("/forgot-password", forgotPasswordRequest);
router.post("/forgot-password/verify-otp", forgotPasswordVerifyOtp);
router.post("/forgot-password/reset", forgotPasswordReset);

export default router;