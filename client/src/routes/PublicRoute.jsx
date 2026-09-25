import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function PublicRoute({ children }) {
  const { user, isChecked } = useAuthStore();

  if (!isChecked) return null;
  if (user) return <Navigate to="/chat" replace />;

  return children;
}