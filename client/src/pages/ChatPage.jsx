import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import HelpModal from "../components/help/HelpModal";
import { useAuthStore } from "../store/authStore";
import { logoutUser } from "../api/auth.api";
import { searchUsersByName, startConversation } from "../api/conversation.api";
import { useChatStore } from "../store/chatStore";

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const [showHelp, setShowHelp] = useState(false);
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsersByName(searchQuery.trim());
        setSearchResults(res.data.users || []);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleStartDM(otherUser) {
    try {
      const res = await startConversation(otherUser._id);
      const convo = res.data.conversation;
      setActiveGroupId(convo._id, "dm", otherUser.anonymousName);
      setSearchQuery("");
      setSearchResults([]);
      if (window.refreshSidebarDMs) {
        window.refreshSidebarDMs();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to start DM");
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      clearUser();
      navigate("/login");
    }
  }

  const isAdmin = user && ["god_admin", "main_admin"].includes(user.role);
  // Help button visible for members and chat monitors only (not admins)
  const showHelpButton = user && !isAdmin;

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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          
          {/* DM Search Bar */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Search user to DM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: "6px",
                border: "1px solid #ddd", fontSize: "0.85em", outline: "none",
                width: "200px"
              }}
            />
            {searchQuery.trim().length >= 2 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, width: "100%",
                backgroundColor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                borderRadius: "4px", marginTop: "4px", zIndex: 1000,
                maxHeight: "200px", overflowY: "auto"
              }}>
                {searching ? (
                  <div style={{ padding: "8px", color: "#888", fontSize: "0.8em" }}>Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: "8px", color: "#888", fontSize: "0.8em" }}>No users found</div>
                ) : (
                  searchResults.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => handleStartDM(u)}
                      style={{
                        padding: "8px 10px", cursor: "pointer",
                        fontSize: "0.85em", display: "flex", alignItems: "center",
                        gap: "8px", transition: "background-color 0.1s",
                        borderBottom: "1px solid #f0f0f0"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e9ecef"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <span style={{ fontWeight: "bold" }}>{u.anonymousName}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {showHelpButton && (
            <button
              onClick={() => setShowHelp(true)}
              style={{
                padding: "6px 14px", cursor: "pointer",
                backgroundColor: "#17a2b8", color: "white",
                border: "none", borderRadius: "4px", fontWeight: "bold",
              }}
            >
              ❓ Help
            </button>
          )}
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
      <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>
        <Sidebar />
        <ChatWindow />
      </div>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}