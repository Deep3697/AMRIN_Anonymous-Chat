import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import { useAuthStore } from "../store/authStore";
import { logoutUser } from "../api/auth.api";

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      clearUser();
      navigate("/login");
    }
  }

  const isAdmin = user && ["god_admin", "main_admin"].includes(user.role);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          borderBottom: "1px solid #ccc",
        }}
      >
        <div>
          <span>Logged in as: <strong>{user?.anonymousName || "Unknown"}</strong> ({user?.role || "member"})</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              style={{ padding: "6px 12px", cursor: "pointer" }}
            >
              Admin Dashboard
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{ padding: "6px 12px", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </div>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <ChatWindow />
      </div>
    </div>
  );
}