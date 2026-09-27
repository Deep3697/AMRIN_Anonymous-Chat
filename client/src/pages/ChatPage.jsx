import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import HelpModal from "../components/help/HelpModal";
import BanAppealModal from "../components/help/BanAppealModal";
import CanteenList from "../components/canteen/CanteenList";
import { useAuthStore } from "../store/authStore";
import { logoutUser } from "../api/auth.api";
import { searchUsersByName, startConversation } from "../api/conversation.api";
import { useChatStore } from "../store/chatStore";

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const [showHelp, setShowHelp] = useState(false);
  const [showCanteen, setShowCanteen] = useState(false);
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Check if user is banned
  const isBanned = user?.status === "banned" || (user?.bannedUntil && new Date(user.bannedUntil) > new Date());

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

  // If user is banned, show only the ban appeal screen
  if (isBanned) {
    return <BanAppealModal />;
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

          {/* Canteen Button - Placed left of Help button */}
          <button
            onClick={() => setShowCanteen(true)}
            style={{
              padding: "6px 14px", cursor: "pointer",
              backgroundColor: "#ff9800", color: "white",
              border: "none", borderRadius: "4px", fontWeight: "bold",
            }}
          >
            🍽️ Canteen
          </button>

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

      {/* Canteen Modal */}
      {showCanteen && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 10000,
          }}
          onClick={() => setShowCanteen(false)}
        >
          <div
            style={{
              backgroundColor: "white", borderRadius: "10px", padding: "24px",
              width: "480px", maxWidth: "90vw", boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
              maxHeight: "80vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CanteenList onClose={() => setShowCanteen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}