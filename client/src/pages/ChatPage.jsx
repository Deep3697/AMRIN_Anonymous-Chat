import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut, Coffee, HelpCircle, Shield, Search, MessageSquare } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import HelpModal from "../components/help/HelpModal";
import BanAppealModal from "../components/help/BanAppealModal";
import CanteenList from "../components/canteen/CanteenList";
import BrandLogo from "../components/logo/brand-logo";
import { useAuthStore } from "../store/authStore";
import { logoutUser } from "../api/auth.api";
import { searchUsersByName, startConversation } from "../api/conversation.api";
import { useChatStore } from "../store/chatStore";
import socket from "../socket/socketClient";
import "./chat.css";

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const [showHelp, setShowHelp] = useState(false);
  const [showCanteen, setShowCanteen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const userMenuRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem("amrin-theme") || "light");
  const [mobileChat, setMobileChat] = useState(false);
  const [kickNotification, setKickNotification] = useState(null);
  const [actionNotification, setActionNotification] = useState(null);

  const isBanned = user?.status === "banned" || (user?.bannedUntil && new Date(user.bannedUntil) > new Date());

  useEffect(() => {
    if (!isBanned) {
      socket.connect();
      
      const handleUserKicked = ({ userId, groupId }) => {
        if (user && String(user.id || user._id || user.sub) === String(userId)) {
          // Persist the kicked group so the user can't re-enter it
          const kickedGroups = JSON.parse(localStorage.getItem("amrin_kicked_groups") || "[]");
          const kickedGroupId = groupId || useChatStore.getState().activeGroupId;
          if (kickedGroupId && !kickedGroups.includes(String(kickedGroupId))) {
            kickedGroups.push(String(kickedGroupId));
            localStorage.setItem("amrin_kicked_groups", JSON.stringify(kickedGroups));
          }

          // If viewing the kicked group, clear active chat
          const currentGroupId = useChatStore.getState().activeGroupId;
          if (String(currentGroupId) === String(kickedGroupId)) {
            setActiveGroupId(null);
          }

          // Show user-friendly notification
          setKickNotification("You have been removed from this group by an admin.");
          setTimeout(() => setKickNotification(null), 5000);
        }
      };

      const handleMutedAlert = ({ userId, mutedUntil }) => {
        const myId = String(user?.id || user?._id || user?.sub);
        if (String(userId) === myId) {
          const until = new Date(mutedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
          setActionNotification(`🔇 You have been muted until ${until}`);
          setTimeout(() => setActionNotification(null), 5000);
        }
      };

      const handleActionSuccess = ({ action, userId }) => {
        const labels = { muted: "🔇 User muted", kicked: "🚫 User kicked", added: "✅ User added", promoted: "⬆️ User promoted to monitor", demoted: "⬇️ User demoted to member" };
        setActionNotification(labels[action] || `✅ Action: ${action}`);
        setTimeout(() => setActionNotification(null), 3000);
      };

      socket.on("user:kicked", handleUserKicked);
      socket.on("user:mutedAlert", handleMutedAlert);
      socket.on("user:actionSuccess", handleActionSuccess);
      
      return () => {
        socket.off("user:kicked", handleUserKicked);
        socket.off("user:mutedAlert", handleMutedAlert);
        socket.off("user:actionSuccess", handleActionSuccess);
        socket.disconnect();
      };
    }
  }, [isBanned, user, setActiveGroupId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("amrin-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (activeGroupId && window.innerWidth <= 767) setMobileChat(true);
  }, [activeGroupId]);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsersByName(searchQuery.trim());
        setSearchResults(res.data.users || []);
      } catch (err) { console.error("Search failed:", err); setSearchResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartDM = useCallback(async (otherUser) => {
    try {
      const res = await startConversation(otherUser._id);
      const convo = res.data.conversation;
      window.dispatchEvent(new Event("switch-to-dms"));
      setActiveGroupId(convo._id, "dm", otherUser.anonymousName);
      setSearchQuery(""); setSearchResults([]);
      if (window.refreshSidebarDMs) window.refreshSidebarDMs();
    } catch (err) { alert(err.response?.data?.error || "Failed to start DM"); }
  }, [setActiveGroupId]);

  async function handleLogout() {
    setShowUserMenu(false);
    try { await logoutUser(); } finally {
      useChatStore.getState().setActiveGroupId(null);
      clearUser(); navigate("/login");
    }
  }

  function toggleTheme() { setTheme((p) => (p === "light" ? "dark" : "light")); }
  function handleMobileBack() { setMobileChat(false); }

  if (isBanned) return <BanAppealModal />;

  const isAdmin = user && ["god_admin", "main_admin"].includes(user.role);
  const showHelpButton = user && !isAdmin;
  const userInitial = (user?.anonymousName || "U")[0].toUpperCase();
  const roleLabel = user?.role === "god_admin" ? "God Admin"
    : user?.role === "main_admin" ? "Admin"
      : user?.role === "chat_monitor" ? "Monitor"
        : "Member";

  return (
    <div className="chat-app">

      {/* ═══ BAR 2 — Brand Strip (AMRIN.CHAT logo, status, theme + user) ═══ */}
      <header className="topbar-2">
        <div className="topbar-left">
          <BrandLogo text="AMRIN.CHAT" delay={80} startDelay={300} className="topbar-brand" />
        </div>

        {/* Center status removed */}
        <div className="topbar-center" />

        <div className="topbar-right-section">
          <div
            className={`theme-toggle-pill ${theme === "dark" ? "theme-toggle-pill--dark" : ""}`}
            onClick={toggleTheme}
            role="button"
            tabIndex={0}
            aria-label="Toggle theme"
          >
            <div className="theme-toggle-pill-track">
              <div className="theme-toggle-pill-thumb">
                {theme === "dark" ? <Moon size={14} strokeWidth={1.5} /> : <Sun size={14} strokeWidth={1.5} />}
              </div>
              <div className="theme-toggle-pill-ghost">
                {theme === "dark" ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
              </div>
            </div>
          </div>

          {/* User Avatar + Dropdown */}
          <div className="user-menu-wrapper" ref={userMenuRef}>
            <button
              className={`topbar-avatar-btn ${showUserMenu ? "topbar-avatar-btn--active" : ""}`}
              onClick={() => setShowUserMenu((p) => !p)}
              title={user?.anonymousName || "User"}
            >
              <span>{userInitial}</span>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-av">{userInitial}</div>
                  <div className="user-dropdown-info">
                    <div className="user-dropdown-name">{user?.anonymousName || "User"}</div>
                    <span className={`user-dropdown-role-badge user-dropdown-role-badge--${user?.role || "member"}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <div className="user-dropdown-divider" />

                {isAdmin && (
                  <button
                    className="user-dropdown-item"
                    onClick={() => { navigate("/admin"); setShowUserMenu(false); }}
                  >
                    <Shield size={14} />
                    <span>Admin Panel</span>
                    <span className="user-dropdown-item-badge">PANEL</span>
                  </button>
                )}

                <button className="user-dropdown-item user-dropdown-item--danger" onClick={handleLogout}>
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ BAR 1 — Utility Strip (Canteen/Help left, Search center) ═══ */}
      <div className="topbar-1">
        <div className="topbar-1-left" />

        <div className="topbar-1-center">
          <div className="chat-search-box">
            <Search className="chat-search-icon" />
            <input
              type="text"
              className="chat-search-input"
              placeholder="Search user to DM…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            {searchFocused && searchQuery.trim().length >= 2 && (
              <div className="search-results-dropdown">
                {searching ? (
                  <div className="search-result-empty">Searching…</div>
                ) : searchResults.length === 0 ? (
                  <div className="search-result-empty">No users found</div>
                ) : (
                  searchResults.map((u) => (
                    <div key={u._id} className="search-result-item" onMouseDown={() => handleStartDM(u)}>
                      <div className="search-result-av">{(u.anonymousName || "?")[0].toUpperCase()}</div>
                      <span>{u.anonymousName}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="topbar-1-right">
          <button className="topbar-action-btn topbar-action-btn--canteen" onClick={() => setShowCanteen(true)}>
            <Coffee size={14} />
            <span className="topbar-btn-text">Canteen</span>
            <span className="topbar-btn-badge topbar-btn-badge--live">LIVE</span>
          </button>

          {showHelpButton && (
            <button className="topbar-action-btn" onClick={() => setShowHelp(true)}>
              <HelpCircle size={14} />
              <span className="topbar-btn-text">Help</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className={`chat-main ${mobileChat ? "chat-main--mobile-chat-open" : ""}`}>
        <Sidebar />
        <div className="chat-area">
          {!activeGroupId ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon"><MessageSquare size={38} /></div>
              <p className="chat-empty-text">Select a conversation to start chatting</p>
            </div>
          ) : (
            <ChatWindow onMobileBack={handleMobileBack} />
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showCanteen && (
        <div className="modal-overlay" onClick={() => setShowCanteen(false)}>
          <div className="modal-backdrop" />
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <CanteenList onClose={() => setShowCanteen(false)} />
          </div>
        </div>
      )}

      {/* ═══ KICK NOTIFICATION TOAST ═══ */}
      {kickNotification && (
        <div className="kick-toast">
          <div className="kick-toast-icon">🚫</div>
          <span className="kick-toast-text">{kickNotification}</span>
          <button className="kick-toast-close" onClick={() => setKickNotification(null)}>✕</button>
        </div>
      )}

      {/* ═══ ACTION NOTIFICATION TOAST ═══ */}
      {actionNotification && (
        <div className="kick-toast">
          <span className="kick-toast-text">{actionNotification}</span>
          <button className="kick-toast-close" onClick={() => setActionNotification(null)}>✕</button>
        </div>
      )}
    </div>
  );
}