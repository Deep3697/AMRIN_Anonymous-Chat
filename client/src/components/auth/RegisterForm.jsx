import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerEmail, verifyOtp, completeProfile, fetchSession } from "../../api/auth.api";
import { useAuthStore } from "../../store/authStore";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, User, ShieldCheck, KeyRound } from "lucide-react";
import BrandLogo, { TypewriterText } from "../logo/brand-logo";
import "./auth.css";

/* ═══════════════════════════════════════════════════════════════
   STEP INDICATOR DOTS
   ═══════════════════════════════════════════════════════════════ */
function StepIndicator({ currentStep, totalSteps = 3 }) {
  return (
    <div className="auth-steps">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <motion.div
            className={`auth-step-dot ${
              s === currentStep ? "auth-step-dot--active" : s < currentStep ? "auth-step-dot--done" : ""
            }`}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
          {i < totalSteps - 1 && (
            <div className={`auth-step-line ${s < currentStep ? "auth-step-line--done" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6-BOX OTP INPUT
   ═══════════════════════════════════════════════════════════════ */
function OtpBoxes({ value, onChange, length = 6 }) {
  const inputRefs = useRef([]);
  const digits = value.split("").concat(Array(length - value.length).fill(""));

  const handleChange = (index, char) => {
    if (!/^\d?$/.test(char)) return; // only allow digits

    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join("").slice(0, length);
    onChange(newValue);

    // Auto-advance to next box
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    // Focus last filled box or the next empty one
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="auth-otp-boxes">
      {digits.slice(0, length).map((d, i) => (
        <motion.input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`auth-otp-box ${d ? "auth-otp-box--filled" : ""}`}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoFocus={i === 0}
          whileFocus={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PASSWORD STRENGTH METER
   ═══════════════════════════════════════════════════════════════ */
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 5)] };
}

function PasswordStrength({ password }) {
  const { score, label } = getPasswordStrength(password);
  if (!password) return null;

  const levels = ["weak", "fair", "good", "strong"];
  return (
    <div>
      <div className="auth-pw-strength">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`auth-pw-bar ${i <= score ? `auth-pw-bar--${levels[Math.min(score, 4) - 1]}` : ""}`}
          />
        ))}
      </div>
      <div className="auth-pw-label">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESEND OTP TIMER
   ═══════════════════════════════════════════════════════════════ */
function ResendTimer({ email, onResend }) {
  const [countdown, setCountdown] = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
      setCountdown(30);
    } catch {
      /* error handled upstream */
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-resend-row">
      {countdown > 0 ? (
        <>Resend OTP in <strong>{countdown}s <br/>(valid for only 10 minutes)</strong></>
      ) : (
        <button
          type="button"
          className="auth-resend-btn"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Sending…" : "Resend OTP"}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP META
   ═══════════════════════════════════════════════════════════════ */
const stepMeta = {
  1: { title: "Create Account", subtitle: "Enter your university email to get started" },
  2: { title: "Verify Email", subtitle: "We sent a code to your email" },
  3: { title: "Set Up Profile", subtitle: "Choose your anonymous identity" },
};

/* ── Slide animation variants ─────────────────────────────── */
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

/* ═══════════════════════════════════════════════════════════════
   REGISTER FORM
   ═══════════════════════════════════════════════════════════════ */
export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [anonymousName, setAnonymousName] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Sequential animation: AMRIN.CHAT first → then title
  const [logoTyped, setLogoTyped] = useState(false);

  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  // 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [6, -6]);
  const rotateY = useTransform(mouseX, [-300, 300], [-6, 6]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  function goToStep(nextStep) {
    setDirection(nextStep > step ? 1 : -1);
    setError("");
    setStep(nextStep);
  }

  /* ── Step handlers ── */
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");

    const nirmaEmailRegex = /^[a-zA-Z0-9._%+-]+@nirmauni\.ac\.in$/i;
    if (!nirmaEmailRegex.test(email)) {
      setError("Please use your @nirmauni.ac.in email address");
      return;
    }

    setIsLoading(true);
    try {
      await registerEmail(email);
      goToStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const handleResendOtp = useCallback(async () => {
    setError("");
    await registerEmail(email);
  }, [email]);

  async function handleOtpSubmit(e) {
    e.preventDefault();
    if (code.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await verifyOtp(email, code);
      setSignupToken(res.data.signupToken);
      goToStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await completeProfile({ signupToken, anonymousName, gender, password });
      const res = await fetchSession();
      setUser(res.data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Button labels per step ── */
  const btnLabels = { 1: "Send OTP", 2: "Verify Code", 3: "Create Account" };
  const handlers = { 1: handleEmailSubmit, 2: handleOtpSubmit, 3: handleProfileSubmit };

  return (
    <div className="auth-page">
      {/* ── Background ── */}
      <div className="auth-bg-gradient" />
      <div className="auth-noise" />
      <div className="auth-top-glow" />
      <motion.div
        className="auth-bottom-glow"
        animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, repeatType: "mirror", delay: 1 }}
      />
      <div className="auth-glow-spot auth-glow-spot--left" />
      <div className="auth-glow-spot auth-glow-spot--right" />

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="auth-perspective"
      >
        <motion.div
          className="auth-card-wrapper"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 8 }}
        >
          {/* Beams */}
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

          {/* ── Glass Card ── */}
          <div className="auth-card">
            <div className="auth-card-pattern" />

            {/* Header with Brand Logo */}
            <div className="auth-header">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
              >
                <BrandLogo 
                  text="AMRIN.CHAT" 
                  delay={140} 
                  startDelay={300} 
                  onComplete={() => setLogoTyped(true)} 
                />
              </motion.div>

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <h1 className="auth-title">
                    <TypewriterText 
                      key={stepMeta[step].title} 
                      text={stepMeta[step].title} 
                      delay={50} 
                      startDelay={250} 
                      active={logoTyped || step > 1} 
                      hideCursorOnDone 
                    />
                  </h1>
                  <motion.p 
                    className="auth-subtitle"
                    initial={{ opacity: step === 1 ? 0 : 1 }}
                    animate={{ opacity: logoTyped || step > 1 ? 1 : 0 }}
                    transition={{ delay: step === 1 ? 0.6 : 0, duration: 0.4 }}
                  >
                    {stepMeta[step].subtitle}
                  </motion.p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Step indicator */}
            <StepIndicator currentStep={step} totalSteps={3} />

            {/* Form */}
            <form onSubmit={handlers[step]} className="auth-form">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="auth-step-content auth-form"
                >
                  {/* ═══ Step 1: Email ═══ */}
                  {step === 1 && (
                    <motion.div
                      className={`auth-input-group ${focusedInput === "email" ? "auth-input-group--focused" : ""}`}
                      whileHover={{ scale: 1.008 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="auth-input-border" />
                      <div className="auth-input-row">
                        <Mail className="auth-input-icon" />
                        <input
                          type="email"
                          className="auth-input"
                          placeholder="University email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedInput("email")}
                          onBlur={() => setFocusedInput(null)}
                          required
                          autoFocus
                          autoComplete="email"
                        />
                        <AnimatePresence>
                          {focusedInput === "email" && (
                            <motion.div
                              layoutId="auth-signup-highlight"
                              className="auth-input-highlight"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ Step 2: OTP (6-box) ═══ */}
                  {step === 2 && (
                    <>
                      <p className="auth-otp-hint">
                        Check <strong style={{ color: "var(--amrin-navy)" }}>{email}</strong> for the code
                        <span style={{ display: "block", fontSize: "0.85em", opacity: 0.8, marginTop: "4px", textWrap: "balance" }}>
                          (Check your spam folder if you don't see it!)
                        </span>
                      </p>

                      <OtpBoxes value={code} onChange={setCode} length={6} />

                      <ResendTimer email={email} onResend={handleResendOtp} />
                    </>
                  )}

                  {/* ═══ Step 3: Profile ═══ */}
                  {step === 3 && (
                    <>
                      {/* Anonymous name */}
                      <motion.div
                        className={`auth-input-group ${focusedInput === "name" ? "auth-input-group--focused" : ""}`}
                        whileHover={{ scale: 1.008 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="auth-input-border" />
                        <div className="auth-input-row">
                          <User className="auth-input-icon" />
                          <input
                            type="text"
                            className="auth-input"
                            placeholder="Anonymous name"
                            value={anonymousName}
                            onChange={(e) => setAnonymousName(e.target.value)}
                            onFocus={() => setFocusedInput("name")}
                            onBlur={() => setFocusedInput(null)}
                            required
                            autoFocus
                          />
                          <AnimatePresence>
                            {focusedInput === "name" && (
                              <motion.div
                                layoutId="auth-signup-highlight"
                                className="auth-input-highlight"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      {/* Gender select */}
                      <motion.div
                        className={`auth-input-group ${focusedInput === "gender" ? "auth-input-group--focused" : ""}`}
                        whileHover={{ scale: 1.008 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="auth-input-border" />
                        <div className="auth-input-row">
                          <User className="auth-input-icon" />
                          <select
                            className="auth-select"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            onFocus={() => setFocusedInput("gender")}
                            onBlur={() => setFocusedInput(null)}
                            required
                          >
                            <option value="" disabled>Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          <AnimatePresence>
                            {focusedInput === "gender" && (
                              <motion.div
                                layoutId="auth-signup-highlight"
                                className="auth-input-highlight"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      {/* Password */}
                      <motion.div
                        className={`auth-input-group ${focusedInput === "password" ? "auth-input-group--focused" : ""}`}
                        whileHover={{ scale: 1.008 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="auth-input-border" />
                        <div className="auth-input-row">
                          <KeyRound className="auth-input-icon" />
                          <input
                            type={showPassword ? "text" : "password"}
                            className="auth-input"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedInput("password")}
                            onBlur={() => setFocusedInput(null)}
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="auth-pwd-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <Eye /> : <EyeClosed />}
                          </button>
                          <AnimatePresence>
                            {focusedInput === "password" && (
                              <motion.div
                                layoutId="auth-signup-highlight"
                                className="auth-input-highlight"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      {/* Password strength meter */}
                      <PasswordStrength password={password} />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="auth-error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <div style={{ position: "relative" }}>
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={isLoading}
                  className={`auth-btn-primary ${isLoading ? "auth-btn-primary--loading" : ""}`}
                >
                  <div className="auth-btn-shimmer" />
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="auth-spinner" />
                      </motion.div>
                    ) : (
                      <motion.span
                        key={`btn-${step}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        {btnLabels[step]}
                        <ArrowRight className="auth-btn-arrow" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Footer */}
              <motion.p
                className="auth-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Already have an account?{" "}
                <Link to="/login" className="auth-footer-link">
                  Sign in
                </Link>
              </motion.p>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
