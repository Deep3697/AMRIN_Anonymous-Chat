import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, fetchSession } from "../../api/auth.api";
import { useAuthStore } from "../../store/authStore";

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await loginUser(identifier, password);
      const res = await fetchSession();
      setUser(res.data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Email or username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p>{error}</p>}
      <button type="submit">Log in</button>
    </form>
  );
}