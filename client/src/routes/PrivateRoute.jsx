import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function PrivateRoute({ children }) {
  const { user, isChecked } = useAuthStore();

  if (!isChecked) return null; // still checking — render nothing yet, not a redirect
  if (!user) return <Navigate to="/" replace />;

  return children;
}