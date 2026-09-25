import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { fetchSession } from "./api/auth.api";
import PrivateRoute from "./routes/PrivateRoute";
import PublicRoute from "./routes/PublicRoute";
import HeroPage from "./components/hero/HeroPage";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import ChatWindow from "./components/chat/ChatWindow";

export default function App() {
  const { setUser, clearUser } = useAuthStore();

  useEffect(() => {
    fetchSession()
      .then((res) => setUser(res.data.user))
      .catch(() => clearUser());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><HeroPage /></PublicRoute>} />
        <Route path="/chat" element={<PrivateRoute><ChatWindow /></PrivateRoute>} />
        <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterForm /></PublicRoute>} />
      </Routes>
    </BrowserRouter>
  );
}