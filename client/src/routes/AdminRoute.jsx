import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function AdminRoute({ children }) {
  const { user, isChecked } = useAuthStore();

  if (!isChecked) return null;
  if (!user || !["god_admin", "main_admin"].includes(user.role)) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}