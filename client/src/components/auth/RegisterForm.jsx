import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerEmail, verifyOtp, completeProfile, fetchSession } from "../../api/auth.api";
import { useAuthStore } from "../../store/authStore";

export default function RegisterForm() {
  const [step, setStep] = useState(1); // 1 = email, 2 = otp, 3 = profile
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [anonymousName, setAnonymousName] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await registerEmail(email);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await verifyOtp(email, code);
      setSignupToken(res.data.signupToken);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await completeProfile({ signupToken, anonymousName, gender, password });
      const res = await fetchSession();
      setUser(res.data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  if (step === 1) {
    return (
      <form onSubmit={handleEmailSubmit}>
        <input type="email" placeholder="University email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        {error && <p>{error}</p>}
        <button type="submit">Send OTP</button>
      </form>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={handleOtpSubmit}>
        <input type="text" placeholder="Enter OTP" value={code}
          onChange={(e) => setCode(e.target.value)} />
        {error && <p>{error}</p>}
        <button type="submit">Verify</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleProfileSubmit}>
      <input type="text" placeholder="Anonymous name" value={anonymousName}
        onChange={(e) => setAnonymousName(e.target.value)} />
      <select value={gender} onChange={(e) => setGender(e.target.value)}>
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <input type="password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)} />
      {error && <p>{error}</p>}
      <button type="submit">Create account</button>
    </form>
  );
}