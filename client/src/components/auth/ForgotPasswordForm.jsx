import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import BrandLogo, { TypewriterText } from "../logo/brand-logo";
import "./auth.css";
import "./forgot-password.css";

import axiosClient from "../../api/axiosClient";
const forgotPasswordRequest = (email) =>
  axiosClient.post("/auth/forgot-password", { email });
const forgotPasswordVerifyOtp = (email, code) =>
  axiosClient.post("/auth/forgot-password/verify-otp", { email, code });
const forgotPasswordReset = (email, code, newPassword) =>
  axiosClient.post("/auth/forgot-password/reset", { email, code, newPassword });

const RESEND_COOLDOWN = 30;

// STEP 1 - Email Input
function StepEmail({ onNext }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const nirmaEmailRegex = /^[a-zA-Z0-9._%+-]+@nirmauni\.ac\.in$/i;
    if (!nirmaEmailRegex.test(email)) {
      setError("Please use your @nirmauni.ac.in email address");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPasswordRequest(email);
      onNext(email);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code. Please check your email.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div key="step-email" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      <div className="fp-step-icon-wrap">
        <div className="fp-step-icon"><Mail size={26} /></div>
      </div>
      <p className="auth-otp-hint">Enter the email address linked to your account. We will send you a 6-digit reset code.</p>
      <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 18 }}>
        <motion.div className={`auth-input-group ${focused ? "auth-input-group--focused" : ""}`} whileHover={{ scale: 1.006 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
          <div className="auth-input-border" />
          <div className="auth-input-row">
            <Mail className="auth-input-icon" />
            <input type="email" className="auth-input" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} required autoComplete="email" autoFocus />
          </div>
        </motion.div>
        <AnimatePresence>
          {error && (<motion.div className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{error}</motion.div>)}
        </AnimatePresence>
        <div style={{ position: "relative" }}>
          <motion.button whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.985 }} type="submit" disabled={isLoading} className={`auth-btn-primary ${isLoading ? "auth-btn-primary--loading" : ""}`}>
            <div className="auth-btn-shimmer" />
            <AnimatePresence mode="wait">
              {isLoading ? (<motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="auth-spinner" /></motion.div>) : (<motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", alignItems: "center", gap: "6px" }}>Send Reset Code<ArrowRight className="auth-btn-arrow" /></motion.span>)}
            </AnimatePresence>
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

// STEP 2 - OTP Verification
function StepOtp({ email, onNext, onBack }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Countdown
  useState(() => {
    const interval = setInterval(() => {
      setResendCooldown((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  });

  function handleChange(idx, val) {
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[idx] = cleaned; setOtp(next);
    if (cleaned && idx < 5) inputRefs.current[idx + 1]?.focus();
  }
  function handleKeyDown(idx, e) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  }
  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setError(""); setIsLoading(true);
    try {
      await forgotPasswordVerifyOtp(email, code);
      onNext(code);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired code.");
    } finally { setIsLoading(false); }
  }

  async function handleResend() {
    setResending(true);
    try {
      await forgotPasswordRequest(email);
      setResendCooldown(RESEND_COOLDOWN);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend code.");
    } finally { setResending(false); }
  }

  return (
    <motion.div key="step-otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      <div className="fp-step-icon-wrap">
        <div className="fp-step-icon fp-step-icon--otp"><ShieldCheck size={26} /></div>
      </div>
      <p className="auth-otp-hint">
        Check <strong style={{ color: "var(--amrin-navy)" }}>{email}</strong> for the code
        <span style={{ display: "block", fontSize: "0.85em", opacity: 0.8, marginTop: "4px", textWrap: "balance" }}>
          (Check your spam folder if you don't see it!)
        </span>
      </p>
      <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 18 }}>
        <div className="auth-otp-boxes" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input key={idx} ref={(el) => (inputRefs.current[idx] = el)} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} className={`auth-otp-box ${digit ? "auth-otp-box--filled" : ""}`} autoFocus={idx === 0} />
          ))}
        </div>
        <div className="auth-resend-row">
          {resendCooldown > 0 ? (
            <>Resend code in <strong>{resendCooldown}s <br/>(valid for only 10 minutes)</strong></>
          ) : (
            <button type="button" className="auth-resend-btn" onClick={handleResend} disabled={resending}>
              {resending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>
        <AnimatePresence>
          {error && (<motion.div className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{error}</motion.div>)}
        </AnimatePresence>
        <div style={{ position: "relative" }}>
          <motion.button whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.985 }} type="submit" disabled={isLoading || otp.join("").length < 6} className={`auth-btn-primary ${isLoading ? "auth-btn-primary--loading" : ""}`}>
            <div className="auth-btn-shimmer" />
            <AnimatePresence mode="wait">
              {isLoading ? (<motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="auth-spinner" /></motion.div>) : (<motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", alignItems: "center", gap: "6px" }}>Verify Code<ArrowRight className="auth-btn-arrow" /></motion.span>)}
            </AnimatePresence>
          </motion.button>
        </div>
        <button type="button" className="fp-back-btn" onClick={onBack}><ArrowLeft size={14} /> Back</button>
      </form>
    </motion.div>
  );
}

// STEP 3 - New Password
function StepNewPassword({ email, otp, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function getStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  }
  const strength = getStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthClass = ["", "auth-pw-bar--weak", "auth-pw-bar--fair", "auth-pw-bar--good", "auth-pw-bar--strong"][strength];

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(""); setIsLoading(true);
    try {
      await forgotPasswordReset(email, otp, password);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
    } finally { setIsLoading(false); }
  }

  return (
    <motion.div key="step-password" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      <div className="fp-step-icon-wrap">
        <div className="fp-step-icon fp-step-icon--pwd"><Lock size={26} /></div>
      </div>
      <p className="auth-otp-hint">Create a strong new password for your account.</p>
      <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 18 }}>
        <motion.div className={`auth-input-group ${focusedInput === "pwd" ? "auth-input-group--focused" : ""}`} whileHover={{ scale: 1.006 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
          <div className="auth-input-border" />
          <div className="auth-input-row">
            <Lock className="auth-input-icon" />
            <input type={showPwd ? "text" : "password"} className="auth-input" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocusedInput("pwd")} onBlur={() => setFocusedInput(null)} required autoFocus />
            <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>{showPwd ? <Eye /> : <EyeClosed />}</button>
          </div>
        </motion.div>
        {password && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <div className="auth-pw-strength">
              {[1, 2, 3, 4].map((lvl) => (<div key={lvl} className={`auth-pw-bar ${lvl <= strength ? strengthClass : ""}`} />))}
            </div>
            <div className="auth-pw-label">{strengthLabel}</div>
          </motion.div>
        )}
        <motion.div className={`auth-input-group ${focusedInput === "confirm" ? "auth-input-group--focused" : ""}`} whileHover={{ scale: 1.006 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
          <div className="auth-input-border" />
          <div className="auth-input-row">
            <Lock className="auth-input-icon" />
            <input type={showConfirm ? "text" : "password"} className="auth-input" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onFocus={() => setFocusedInput("confirm")} onBlur={() => setFocusedInput(null)} required />
            <button type="button" className="auth-pwd-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>{showConfirm ? <Eye /> : <EyeClosed />}</button>
          </div>
        </motion.div>
        <AnimatePresence>
          {error && (<motion.div className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{error}</motion.div>)}
        </AnimatePresence>
        <div style={{ position: "relative" }}>
          <motion.button whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.985 }} type="submit" disabled={isLoading} className={`auth-btn-primary ${isLoading ? "auth-btn-primary--loading" : ""}`}>
            <div className="auth-btn-shimmer" />
            <AnimatePresence mode="wait">
              {isLoading ? (<motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="auth-spinner" /></motion.div>) : (<motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", alignItems: "center", gap: "6px" }}>Reset Password<ArrowRight className="auth-btn-arrow" /></motion.span>)}
            </AnimatePresence>
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

// STEP 4 - Success
function StepSuccess() {
  const navigate = useNavigate();
  return (
    <motion.div key="step-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: "easeOut" }} className="fp-success">
      <motion.div className="fp-success-icon" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}>
        <CheckCircle2 size={52} />
      </motion.div>
      <motion.h2 className="fp-success-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>Password Reset!</motion.h2>
      <motion.p className="fp-success-desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>Your password has been updated successfully. You can now sign in with your new password.</motion.p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
        <motion.button whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.985 }} className="auth-btn-primary" onClick={() => navigate("/login")} style={{ marginTop: 8 }}>
          <div className="auth-btn-shimmer" />
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>Go to Sign In<ArrowRight className="auth-btn-arrow" /></span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// MAIN - ForgotPasswordForm
const STEP_LABELS = ["Email", "Verify", "Reset"];

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [logoTyped, setLogoTyped] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const titles = ["Forgot Password", "Check Your Email", "New Password"];
  const subtitles = ["Reset access to your account", "Enter the code we sent you", "Almost there - set a new password"];

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient" />
      <div className="auth-noise" />
      <div className="auth-top-glow" />
      <motion.div className="auth-bottom-glow" animate={{ opacity: [0.2, 0.35, 0.2], scale: [1, 1.04, 1] }} transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", delay: 1 }} />
      <div className="auth-glow-spot auth-glow-spot--left" />
      <div className="auth-glow-spot auth-glow-spot--right" />

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="auth-perspective">
        <motion.div className="auth-card-wrapper" style={{ rotateX, rotateY }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} whileHover={{ z: 6 }}>
          <div className="auth-card-beams">
            <div className="auth-beam auth-beam--top" />
            <div className="auth-beam auth-beam--right" />
            <div className="auth-beam auth-beam--bottom" />
            <div className="auth-beam auth-beam--left" />
            <div className="auth-corner-dot auth-corner-dot--tl" />
            <div className="auth-corner-dot auth-corner-dot--tr" />
            <div className="auth-corner-dot auth-corner-dot--br" />
            <div className="auth-corner-dot auth-corner-dot--bl" />
          </div>
          <div className="auth-card-border-glow" />
          <div className="auth-card-shadow-glow" />

          <div className="auth-card">
            <div className="auth-card-pattern" />
            <div className="auth-header">
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.8 }}>
                <BrandLogo text="AMRIN.CHAT" delay={150} startDelay={300} onComplete={() => setLogoTyped(true)} />
              </motion.div>
              {step < 3 && (
                <>
                  <h1 className="auth-title">
                    <TypewriterText text={titles[step]} delay={55} startDelay={200} active={logoTyped} hideCursorOnDone />
                  </h1>
                  <motion.p className="auth-subtitle" initial={{ opacity: 0 }} animate={{ opacity: logoTyped ? 1 : 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
                    {subtitles[step]}
                  </motion.p>
                </>
              )}
            </div>

            {step < 3 && (
              <div className="auth-steps" style={{ marginBottom: 6 }}>
                {STEP_LABELS.map((label, idx) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div className={`auth-step-dot ${idx === step ? "auth-step-dot--active" : idx < step ? "auth-step-dot--done" : ""}`} />
                    {idx < STEP_LABELS.length - 1 && (<div className={`auth-step-line ${idx < step ? "auth-step-line--done" : ""}`} />)}
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 0 && <StepEmail key="email" onNext={(em) => { setEmail(em); setStep(1); }} />}
              {step === 1 && <StepOtp key="otp" email={email} onNext={(code) => { setVerifiedOtp(code); setStep(2); }} onBack={() => setStep(0)} />}
              {step === 2 && <StepNewPassword key="newpwd" email={email} otp={verifiedOtp} onDone={() => setStep(3)} />}
              {step === 3 && <StepSuccess key="success" />}
            </AnimatePresence>

            {step < 3 && (
              <motion.p className="auth-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ marginTop: 20 }}>
                Remember your password?{" "}
                <Link to="/login" className="auth-footer-link">Sign in</Link>
              </motion.p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
