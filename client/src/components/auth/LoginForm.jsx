import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, fetchSession } from "../../api/auth.api";
import { useAuthStore } from "../../store/authStore";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight } from "lucide-react";
import BrandLogo, { TypewriterText } from "../logo/brand-logo";
import "./auth.css";

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Sequential animation: AMRIN.CHAT first → then title
  const [logoTyped, setLogoTyped] = useState(false);

  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  // 3D tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginUser(identifier, password);
      const res = await fetchSession();
      setUser(res.data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* ── Background Layers ── */}
      <div className="auth-bg-gradient" />
      <div className="auth-noise" />
      <div className="auth-top-glow" />

      <motion.div
        className="auth-bottom-glow"
        animate={{ opacity: [0.2, 0.35, 0.2], scale: [1, 1.04, 1] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", delay: 1 }}
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
          whileHover={{ z: 6 }}
        >
          {/* Animated border beams */}
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

            {/* Brand Logo & Header */}
            <div className="auth-header">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
              >
                <BrandLogo
                  text="AMRIN.CHAT"
                  delay={150}
                  startDelay={300}
                  onComplete={() => setLogoTyped(true)}
                />
              </motion.div>

              {/* Title types AFTER logo finishes */}
              <h1 className="auth-title">
                <TypewriterText
                  text="Welcome Back"
                  delay={55}
                  startDelay={200}
                  active={logoTyped}
                  hideCursorOnDone
                />
              </h1>

              <motion.p
                className="auth-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: logoTyped ? 1 : 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                Sign in to continue to AMRIN
              </motion.p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              {/* Email / Username */}
              <motion.div
                className={`auth-input-group ${focusedInput === "identifier" ? "auth-input-group--focused" : ""}`}
                whileHover={{ scale: 1.006 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="auth-input-border" />
                <div className="auth-input-row">
                  <Mail className="auth-input-icon" />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Email or username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onFocus={() => setFocusedInput("identifier")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    autoComplete="username"
                  />
                  <AnimatePresence>
                    {focusedInput === "identifier" && (
                      <motion.div
                        layoutId="auth-input-highlight"
                        className="auth-input-highlight"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Password */}
              <motion.div
                className={`auth-input-group ${focusedInput === "password" ? "auth-input-group--focused" : ""}`}
                whileHover={{ scale: 1.006 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="auth-input-border" />
                <div className="auth-input-row">
                  <Lock className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    autoComplete="current-password"
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
                        layoutId="auth-input-highlight"
                        className="auth-input-highlight"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Remember Me & Forgot Password */}
              <div className="auth-extras">
                <label className="auth-remember">
                  <div className="auth-checkbox-wrapper">
                    <input
                      type="checkbox"
                      className="auth-checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                    />
                    {rememberMe && (
                      <motion.div
                        className="auth-checkmark"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <span className="auth-remember-label">Remember me</span>
                </label>
                <button type="button" className="auth-forgot" onClick={() => {}}>
                  Forgot password?
                </button>
              </div>

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

              {/* Submit Button */}
              <div style={{ position: "relative" }}>
                <motion.button
                  whileHover={{ scale: 1.012 }}
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
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        Sign In
                        <ArrowRight className="auth-btn-arrow" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Footer link */}
              <motion.p
                className="auth-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Don&apos;t have an account?{" "}
                <Link to="/register" className="auth-footer-link">
                  Sign up
                </Link>
              </motion.p>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
