import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { fetchMyConversations, searchUsersByName, startConversation } from "../api/conversation.api";
import { fetchAllBatches } from "../api/admin.api";
import { fetchMyGroups } from "../api/group.api";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { logoutUser } from "../api/auth.api";
import socket from "../socket/socketClient";

// Admin panels
import BatchCreateForm from "../components/admin/BatchCreateForm";
import UnassignedUsersList from "../components/admin/UnassignedUsersList";
import AssignInstitutePanel from "../components/admin/AssignInstitutePanel";
import AssignBranchPanel from "../components/admin/AssignBranchPanel";
import AssignDivisionPanel from "../components/admin/AssignDivisionPanel";
import PendingRequestsQueue from "../components/admin/PendingRequestsQueue";
import ReportsQueue from "../components/admin/ReportsQueue";
import BanPanel from "../components/admin/BanPanel";
import BanAppealsPanel from "../components/admin/BanAppealsPanel";
import MutePanel from "../components/admin/MutePanel";
import CreateCanteenPanel from "../components/admin/CreateCanteenPanel";
import HelpQueuePanel from "../components/admin/HelpQueuePanel";
import ChatWindow from "../components/chat/ChatWindow";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);
  const activeGroupId = useChatStore((s) => s.activeGroupId);

  // Persist active tab across refreshes
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem("admin_active_tab") || "overview";
  });

  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Batches drill-down state (persisted across refreshes)
  const [batches, setBatches] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedBatch, setSelectedBatchState] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_selected_batch");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [batchGroups, setBatchGroups] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // DM state
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dmUnreadDot, setDmUnreadDot] = useState(false);

  const isGodAdmin = user?.role === "god_admin";

  const handleTabChange = (tab) => {
    localStorage.setItem("admin_active_tab", tab);
    setActiveTabState(tab);
    if (tab === "chat") {
      loadDMs();
    }
    if (tab === "batches") {
      loadBatches();
    }
    if (tab !== "batches" && tab !== "chat") {
      setActiveGroupId(null);
    }
  };

  const setSelectedBatch = (batch) => {
    if (batch) {
      localStorage.setItem("admin_selected_batch", JSON.stringify(batch));
    } else {
      localStorage.removeItem("admin_selected_batch");
    }
    setSelectedBatchState(batch);
  };

  // Connect socket
  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  // Fetch stats from database on mount and when refreshKey changes
  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  function loadStats() {
    axiosClient.get("/admin/stats")
      .then((res) => {
        setStats(res.data.stats);
        setRecentActivity(res.data.recentActivity || []);
      })
      .catch((err) => {
        console.error("Failed to load admin stats:", err);
      });
  }

  // Load all groups to calculate unread dots per batch
  useEffect(() => {
    fetchMyGroups()
      .then((res) => {
        const list = res.data.groups || [];
        setAllGroups(list);
        list.forEach((g) => {
          if (g.unreadCount > 0) {
            setUnreadCounts((prev) => ({ ...prev, [g._id]: g.unreadCount }));
          }
        });
      })
      .catch(() => { });
  }, [refreshKey]);

  // Check for unread DMs on mount
  useEffect(() => {
    fetchMyConversations()
      .then((res) => {
        const convos = res.data.conversations || [];
        setConversations(convos);
        const hasUnread = convos.some((c) => c.unreadCount > 0);
        if (hasUnread) setDmUnreadDot(true);
      })
      .catch(() => { });
  }, []);

  // Real-time message listener:
  // - Private DMs set red dot on the topbar "Go to Chat" button
  // - Batch messages only update group/batch unread dots inside the batches section
  useEffect(() => {
    const handleNewMessage = (m) => {
      if (m.threadType === "dm") {
        setDmUnreadDot(true);
      }
      if (m.threadType === "group") {
        const snippet = m.text || `[${m.attachment?.type || "media"}]`;
        const nowIso = m.createdAt || new Date().toISOString();
        const isOwn = String(m.senderId) === String(user?.id || user?._id || user?.sub);

        // Update allGroups with lastMessageAt & snippet so outer batches sort dynamically
        setAllGroups((prev) => {
          const idx = prev.findIndex((g) => String(g._id) === String(m.threadId));
          if (idx === -1) return prev;
          const updated = { ...prev[idx], lastMessageSnippet: snippet, lastMessageAt: nowIso };
          const next = [...prev];
          next[idx] = updated;
          return next;
        });

        // Traverse upwards in the active batch's groups list (slide to index 0)
        setBatchGroups((prev) => {
          const idx = prev.findIndex((g) => String(g._id) === String(m.threadId));
          if (idx === -1) return prev;
          const updated = { ...prev[idx], lastMessageSnippet: snippet, lastMessageAt: nowIso };
          const next = [...prev];
          next.splice(idx, 1);
          next.unshift(updated);
          return next;
        });

        // Increment live unread count if not active group and not own message
        if (!isOwn && String(activeGroupId) !== String(m.threadId)) {
          setUnreadCounts((prev) => ({ ...prev, [m.threadId]: (prev[m.threadId] || 0) + 1 }));
        }
      }
      // Refresh stats on new message
      if (m.createdAt) {
        setStats((prev) => prev ? { ...prev, messagesToday: (prev.messagesToday || 0) + 1 } : prev);
      }
    };
    socket.on("message:new", handleNewMessage);
    return () => socket.off("message:new", handleNewMessage);
  }, [activeGroupId, user]);

  // Compute batch items + Universal Group item, dynamically sorted by latest message
  const sortedBatchItems = (() => {
    // 1. Universal Group item
    const universalGroups = allGroups.filter((g) => g.level === "universal" || !g.batchId);
    let universalLatestTime = 0;
    let universalUnread = 0;
    universalGroups.forEach((g) => {
      const t = g.lastMessageAt ? new Date(g.lastMessageAt).getTime() : 0;
      if (t > universalLatestTime) universalLatestTime = t;
      if (unreadCounts[g._id] > 0) universalUnread += unreadCounts[g._id];
    });

    const universalItem = {
      _id: "universal",
      isUniversal: true,
      label: "🌐 Universal Group",
      subLabel: `${universalGroups.length} campus-wide groups`,
      lastMessageAt: universalLatestTime,
      unreadCount: universalUnread,
      groupsCount: universalGroups.length,
    };

    // 2. Regular Batch items
    const batchItems = batches.map((b) => {
      const bGroups = allGroups.filter((g) => String(g.batchId) === String(b._id));
      let bLatestTime = 0;
      let bUnread = 0;
      bGroups.forEach((g) => {
        const t = g.lastMessageAt ? new Date(g.lastMessageAt).getTime() : 0;
        if (t > bLatestTime) bLatestTime = t;
        if (unreadCounts[g._id] > 0) bUnread += unreadCounts[g._id];
      });

      return {
        ...b,
        isUniversal: false,
        subLabel: `Admission Year: ${b.admissionYear || "N/A"}`,
        lastMessageAt: bLatestTime,
        unreadCount: bUnread,
        groupsCount: bGroups.length,
      };
    });

    // Combine and sort by lastMessageAt descending (latest message goes to the top!)
    const all = [universalItem, ...batchItems];
    all.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    return all;
  })();

  // Batches drill-down initialization
  useEffect(() => {
    if (activeTab === "batches") {
      loadBatches();
      if (selectedBatch) {
        loadBatchGroups(selectedBatch);
      }
    }
    if (activeTab === "chat") {
      loadDMs();
    }
  }, [activeTab]);

  // DM search
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

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      useChatStore.getState().setActiveGroupId(null);
      clearUser();
      navigate("/login");
    }
  }

  function loadDMs() {
    fetchMyConversations()
      .then((res) => setConversations(res.data.conversations || []))
      .catch(() => { });
  }

  function loadBatches() {
    fetchAllBatches()
      .then((res) => setBatches(res.data.batches || []))
      .catch(() => { });
  }

  function loadBatchGroups(batch) {
    fetchMyGroups()
      .then((res) => {
        const list = res.data.groups || [];
        setAllGroups(list);
        let filtered = [];
        if (batch.isUniversal) {
          filtered = list.filter((g) => g.level === "universal" || !g.batchId);
        } else {
          filtered = list.filter((g) => String(g.batchId) === String(batch._id));
        }
        filtered.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
        setBatchGroups(filtered);
        filtered.forEach((g) => {
          if (g.unreadCount > 0) {
            setUnreadCounts((prev) => ({ ...prev, [g._id]: g.unreadCount }));
          }
        });
      })
      .catch(() => { });
  }

  function handleSelectBatch(batch) {
    setSelectedBatch(batch);
    setActiveGroupId(null);
    loadBatchGroups(batch);
  }

  function handleSelectBatchGroup(group) {
    setActiveGroupId(group._id, "group", group.name);
    setUnreadCounts((prev) => ({ ...prev, [group._id]: 0 }));
    axiosClient.patch(`/groups/${group._id}/read`).catch(() => { });
  }

  async function handleStartDM(otherUser) {
    try {
      const res = await startConversation(otherUser._id);
      const convo = res.data.conversation;
      setActiveGroupId(convo._id, "dm", otherUser.anonymousName);
      setSearchQuery("");
      setSearchResults([]);
      loadDMs();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to start DM");
    }
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // ── Sidebar Feature Tabs ──
  const sidebarTabs = [
    { id: "overview", label: "📊 Overview", icon: "📊" },
    { id: "batches_mgmt", label: "🎓 Batches & Assignment", icon: "🎓" },
    { id: "users", label: "👥 User Management", icon: "👥" },
    { id: "moderation", label: "🛡️ Moderation Tools", icon: "🛡️" },
    { id: "reports", label: "🚩 Reports & Help", icon: "🚩" },
    { id: "settings", label: "🍽️ Canteens & Settings", icon: "🍽️" },
    { id: "batches", label: "💬 Batches & Chats", icon: "💬" },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      backgroundColor: "#16171d",
      color: "#f3f4f6",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ── Scoped Dark Mode Styles for Form Elements inside Panels ── */}
      <style>{`
        .admin-dark-theme input[type="text"],
        .admin-dark-theme input[type="password"],
        .admin-dark-theme input[type="number"],
        .admin-dark-theme select,
        .admin-dark-theme textarea {
          background-color: #252836 !important;
          color: #f3f4f6 !important;
          border: 1px solid #3e4155 !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
          font-size: 0.9em !important;
          outline: none !important;
          transition: border-color 0.2s;
        }
        .admin-dark-theme input:focus,
        .admin-dark-theme select:focus,
        .admin-dark-theme textarea:focus {
          border-color: #aa3bff !important;
        }
        .admin-dark-theme button {
          padding: 7px 14px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.15s;
        }
        .admin-dark-theme button:hover {
          filter: brightness(1.1);
        }
        .admin-dark-theme button[type="submit"] {
          background-color: #7c3aed;
          color: #fff;
          border: none;
        }
        .admin-dark-theme hr {
          border: none;
          border-top: 1px solid #2e303a;
          margin: 24px 0;
        }
        .admin-dark-theme h2, .admin-dark-theme h3, .admin-dark-theme h4 {
          color: #f3f4f6;
          margin-top: 0;
        }
        .admin-dark-theme table {
          color: #e2e8f0;
          border-color: #2e303a;
        }
        .admin-dark-theme th {
          border-bottom: 2px solid #3e4155 !important;
          color: #cbd5e1;
        }
        .admin-dark-theme td {
          border-bottom: 1px solid #2e303a !important;
          color: #e2e8f0;
        }
      `}</style>

      {/* ── Topbar (KEPT AS WAS with original buttons & identity, styled in Dark Theme) ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px",
          borderBottom: "1px solid #2e303a",
          backgroundColor: "#16171d",
          color: "#f3f4f6",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "8px",
            backgroundColor: "#7c3aed", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: "bold", fontSize: "1.2em", color: "white"
          }}>C</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ margin: 0, fontSize: "1.35em", fontWeight: 700, color: "#f3f4f6", lineHeight: 1.2 }}>
                {isGodAdmin ? "God Admin Dashboard" : "Admin Dashboard"}
              </h1>
              <span style={{
                fontSize: "0.75em", padding: "2px 8px", borderRadius: "12px",
                backgroundColor: isGodAdmin ? "#fef3c7" : "#e0e7ff",
                color: isGodAdmin ? "#92400e" : "#3730a3", fontWeight: 600
              }}>
                {isGodAdmin ? "God Admin" : "Admin"}
              </span>
            </div>
            <div style={{ fontSize: "0.78em", color: "#9ca3af", marginTop: "2px" }}>
              Campus Chat Management Console
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "0.9em", color: "#cbd5e1" }}>
            Logged in as: <strong style={{ color: "#f3f4f6" }}>{user?.anonymousName || "Admin"}</strong> <span style={{ color: "#9ca3af" }}>({user?.role})</span>
          </span>
          <button
            onClick={() => {
              setDmUnreadDot(false);
              navigate("/chat");
            }}
            style={{
              position: "relative",
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 16px", borderRadius: "6px", border: "1px solid #3e4155",
              backgroundColor: "#1f2028", color: "#f3f4f6", cursor: "pointer",
              fontSize: "0.85em", fontWeight: "600", transition: "background 0.15s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2d303e"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1f2028"; }}
          >
            ← Go to Chat
            {dmUnreadDot && (
              <span style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                boxShadow: "0 0 6px rgba(239, 68, 68, 0.9)",
                display: "inline-block"
              }} />
            )}
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "7px 14px", borderRadius: "6px", border: "none",
              backgroundColor: "#dc2626", color: "white", cursor: "pointer",
              fontSize: "0.85em", fontWeight: "600", transition: "background 0.15s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#b91c1c"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#dc2626"; }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Body: Left Sidebar + Main Content ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Left Sidebar for Features ── */}
        <div style={{
          width: "230px",
          backgroundColor: "#12131a",
          borderRight: "1px solid #2e303a",
          color: "#9ca3af",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0
        }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #2e303a", fontSize: "0.75em", fontWeight: "bold", letterSpacing: "1px", color: "#6b7280" }}>
            ADMIN FEATURES
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {sidebarTabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", padding: "11px 18px", border: "none",
                    backgroundColor: isActive ? "#1e2238" : "transparent",
                    color: isActive ? "#ffffff" : "#9ca3af",
                    fontWeight: isActive ? "600" : "normal",
                    cursor: "pointer", fontSize: "0.88em", textAlign: "left",
                    borderLeft: isActive ? "3px solid #aa3bff" : "3px solid transparent",
                    transition: "all 0.15s ease", position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "#181a24";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Content Area (Dark Theme) ── */}
        <div className="admin-dark-theme" style={{ flex: 1, overflowY: "auto", backgroundColor: "#16171d", padding: activeTab === "batches" ? 0 : "28px 32px" }}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div style={{ maxWidth: "1200px" }}>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ margin: "0 0 6px", color: "#f3f4f6", fontSize: "1.6em" }}>
                  {isGodAdmin ? "God Admin" : "Admin"} Platform Overview
                </h2>
                <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.9em" }}>
                  Real-time database statistics, system events, and platform controls.
                </p>
              </div>

              {/* Stat Cards Connected to Database */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                {[
                  { label: "TOTAL USERS", value: stats?.totalUsers ?? "—", color: "#aa3bff", bg: "rgba(170, 59, 255, 0.12)", icon: "👥" },
                  { label: "ACTIVE GROUPS", value: stats?.activeGroups ?? "—", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "💬" },
                  { label: "BATCHES", value: stats?.batchCount ?? "—", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "🎓", clickable: true, tab: "batches_mgmt" },
                  { label: "MESSAGES TODAY", value: stats?.messagesToday ?? "—", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "✉️" },
                ].map((card) => (
                  <div
                    key={card.label}
                    onClick={card.clickable ? () => handleTabChange(card.tab) : undefined}
                    style={{
                      backgroundColor: "#1f2028", borderRadius: "10px", padding: "20px",
                      border: "1px solid #2e303a", borderLeft: `4px solid ${card.color}`,
                      cursor: card.clickable ? "pointer" : "default",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      transition: "transform 0.15s, border-color 0.15s"
                    }}
                    onMouseEnter={(e) => { if (card.clickable) e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { if (card.clickable) e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.75em", color: "#9ca3af", fontWeight: "600", letterSpacing: "0.5px" }}>
                        {card.label}
                      </span>
                      <span style={{ fontSize: "1.1em" }}>{card.icon}</span>
                    </div>
                    <div style={{ fontSize: "2em", fontWeight: "bold", color: card.color }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Status Counters Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
                {[
                  { label: "Pending Help", value: stats?.pendingHelp ?? 0, color: "#06b6d4", tab: "reports" },
                  { label: "Pending Reports", value: stats?.pendingReports ?? 0, color: "#ef4444", tab: "reports" },
                  { label: "Muted Users", value: stats?.mutedUsers ?? 0, color: "#f59e0b", tab: "moderation" },
                  { label: "Banned Users", value: stats?.bannedUsers ?? 0, color: "#dc2626", tab: "moderation" },
                ].map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleTabChange(item.tab)}
                    style={{
                      backgroundColor: "#1f2028", borderRadius: "10px", padding: "16px 20px",
                      border: "1px solid #2e303a", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#252836"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#1f2028"}
                  >
                    <div>
                      <div style={{ fontSize: "0.8em", color: "#9ca3af", marginBottom: "4px" }}>{item.label}</div>
                      <div style={{ fontSize: "1.4em", fontWeight: "bold", color: item.color }}>{item.value}</div>
                    </div>
                    <span style={{ fontSize: "0.8em", color: "#6b7280" }}>View →</span>
                  </div>
                ))}
              </div>

              {/* Recent Activity (Live from Database) + Quick Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "20px" }}>
                {/* Recent Activity Feed */}
                <div style={{ backgroundColor: "#1f2028", borderRadius: "10px", padding: "22px", border: "1px solid #2e303a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, color: "#f3f4f6", fontSize: "1.05em" }}>Live Database Activity</h3>
                    <button
                      onClick={() => setRefreshKey((k) => k + 1)}
                      style={{ background: "none", border: "none", color: "#aa3bff", cursor: "pointer", fontSize: "0.8em", padding: 0 }}
                    >
                      Refresh ↻
                    </button>
                  </div>
                  {recentActivity.length === 0 ? (
                    <div style={{ color: "#9ca3af", fontSize: "0.9em", padding: "20px 0", textAlign: "center" }}>
                      No recent activity recorded yet.
                    </div>
                  ) : (
                    recentActivity.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "10px 0",
                          borderBottom: i < recentActivity.length - 1 ? "1px solid #2e303a" : "none",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.86em", color: "#e2e8f0" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: a.color || "#aa3bff", display: "inline-block", flexShrink: 0 }} />
                          <span>{a.text}</span>
                        </div>
                        <div style={{ fontSize: "0.75em", color: "#6b7280", whiteSpace: "nowrap", marginLeft: "14px" }}>
                          {timeAgo(a.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Action Shortcuts */}
                <div style={{ backgroundColor: "#1f2028", borderRadius: "10px", padding: "22px", border: "1px solid #2e303a" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#f3f4f6", fontSize: "1.05em" }}>Quick Actions</h3>
                  {[
                    { label: "🎓 Batches & Assignment", action: () => handleTabChange("batches_mgmt"), color: "#aa3bff", desc: "Create batch & assign users" },
                    { label: "👥 User Management", action: () => handleTabChange("users"), color: "#10b981", desc: "Review pending monitor requests" },
                    { label: "🚩 Review Reports & Help", action: () => handleTabChange("reports"), color: "#ef4444", desc: "Inspect user reports & open tickets" },
                    { label: "🛡️ Moderation Tools", action: () => handleTabChange("moderation"), color: "#f59e0b", desc: "Manage mutes, bans, and appeals" },
                    { label: "🍽️ Manage Canteens", action: () => handleTabChange("settings"), color: "#06b6d4", desc: "Configure campus food canteens" },
                    { label: "💬 Batches & Chats View", action: () => handleTabChange("batches"), color: "#3b82f6", desc: "Drill down into batches & live groups" },
                  ].map((qa) => (
                    <button
                      key={qa.label}
                      onClick={qa.action}
                      style={{
                        display: "flex", flexDirection: "column", width: "100%", padding: "10px 14px",
                        marginBottom: "10px", border: "1px solid #2e303a", borderRadius: "8px",
                        backgroundColor: "#16171d", cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#252836";
                        e.currentTarget.style.borderColor = qa.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#16171d";
                        e.currentTarget.style.borderColor = "#2e303a";
                      }}
                    >
                      <span style={{ color: qa.color, fontWeight: "600", fontSize: "0.88em" }}>{qa.label}</span>
                      <span style={{ color: "#9ca3af", fontSize: "0.75em", marginTop: "2px" }}>{qa.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BATCHES & ASSIGNMENT TAB ── */}
          {activeTab === "batches_mgmt" && (
            <div style={{ maxWidth: "1000px" }}>
              <h2 style={{ margin: "0 0 8px", color: "#f3f4f6" }}>🎓 Batches & Structural Assignment</h2>
              <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "0.9em" }}>
                Create batches and assign student cohorts through Institute, Branch, and Division stages.
              </p>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: "20px" }}>
                <BatchCreateForm onBatchCreated={() => { setRefreshKey((k) => k + 1); loadBatches(); }} />
              </div>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: "20px" }}>
                <UnassignedUsersList refreshKey={refreshKey} />
              </div>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: "20px" }}>
                <AssignInstitutePanel />
              </div>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: "20px" }}>
                <AssignBranchPanel />
              </div>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a" }}>
                <AssignDivisionPanel />
              </div>
            </div>
          )}

          {/* ── USER MANAGEMENT TAB ── */}
          {activeTab === "users" && (
            <div style={{ maxWidth: "1000px" }}>
              <h2 style={{ margin: "0 0 8px", color: "#f3f4f6" }}>👥 User Management & Requests</h2>
              <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "0.9em" }}>
                Monitor pending role promotions, unassigned students, and group assignments.
              </p>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: "20px" }}>
                <PendingRequestsQueue />
              </div>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a" }}>
                <UnassignedUsersList refreshKey={refreshKey} />
              </div>
            </div>
          )}

          {/* ── MODERATION TAB ── */}
          {activeTab === "moderation" && (
            <div style={{ maxWidth: "1000px" }}>
              <h2 style={{ margin: "0 0 8px", color: "#f3f4f6" }}>🛡️ Moderation Tools</h2>
              <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "0.9em" }}>
                Enforce community guidelines, manage temporary mutes, and review permanent bans.
              </p>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: "20px" }}>
                <MutePanel />
              </div>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: isGodAdmin ? "20px" : 0 }}>
                <BanPanel />
              </div>

              {isGodAdmin && (
                <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a" }}>
                  <BanAppealsPanel />
                </div>
              )}
            </div>
          )}

          {/* ── REPORTS & HELP TAB ── */}
          {activeTab === "reports" && (
            <div style={{ maxWidth: "1000px" }}>
              <h2 style={{ margin: "0 0 8px", color: "#f3f4f6" }}>🚩 Reports & Help Queue</h2>
              <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "0.9em" }}>
                Review misconduct reports submitted by users and answer student help inquiries.
              </p>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a", marginBottom: "20px" }}>
                <ReportsQueue />
              </div>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a" }}>
                <HelpQueuePanel />
              </div>
            </div>
          )}

          {/* ── SETTINGS & CANTEENS TAB ── */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: "1000px" }}>
              <h2 style={{ margin: "0 0 8px", color: "#f3f4f6" }}>🍽️ Campus Settings & Canteens</h2>
              <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "0.9em" }}>
                Manage campus food spots and configure platform options.
              </p>

              <div style={{ backgroundColor: "#1f2028", padding: "20px", borderRadius: "10px", border: "1px solid #2e303a" }}>
                <CreateCanteenPanel />
              </div>
            </div>
          )}

          {/* ── BATCHES & CHATS DRILL-DOWN TAB ── */}
          {activeTab === "batches" && (
            <div style={{ display: "flex", height: "100%", width: "100%" }}>
              {/* Batch / Group List Panel */}
              <div style={{ width: "300px", borderRight: "1px solid #2e303a", backgroundColor: "#12131a", display: "flex", flexDirection: "column" }}>
                {!selectedBatch ? (
                  <>
                    <div style={{ padding: "16px", borderBottom: "1px solid #2e303a", fontWeight: "bold", color: "#f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>🎓 Batches & Groups</span>
                      <span style={{ fontSize: "0.8em", color: "#9ca3af" }}>{sortedBatchItems.length} items</span>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      {sortedBatchItems.length === 0 ? (
                        <div style={{ padding: "24px", color: "#6b7280", textAlign: "center", fontSize: "0.9em" }}>
                          No batches or groups found.
                        </div>
                      ) : (
                        sortedBatchItems.map((b) => {
                          return (
                            <div
                              key={b._id}
                              onClick={() => handleSelectBatch(b)}
                              style={{
                                padding: "14px 18px", borderBottom: "1px solid #232530",
                                cursor: "pointer", transition: "background-color 0.15s"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1b1d28"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontWeight: "600", color: "#f3f4f6", fontSize: "0.95em" }}>{b.label}</div>
                                {b.unreadCount > 0 && (
                                  <div style={{
                                    backgroundColor: "#25D366", color: "white", borderRadius: "50%",
                                    minWidth: "20px", height: "20px", display: "flex", alignItems: "center",
                                    justifyContent: "center", fontSize: "0.75em", fontWeight: "bold",
                                    padding: "0 4px", flexShrink: 0, marginLeft: "8px"
                                  }}>
                                    {b.unreadCount}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: "0.78em", color: "#9ca3af", marginTop: "3px" }}>
                                {b.subLabel}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #2e303a", display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => { setSelectedBatch(null); setActiveGroupId(null); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer", fontSize: "1.1em", color: "#aa3bff", padding: 0
                        }}
                      >
                        ←
                      </button>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#f3f4f6", fontSize: "0.95em" }}>{selectedBatch.label}</div>
                        <div style={{ fontSize: "0.75em", color: "#9ca3af" }}>{batchGroups.length} associated groups</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      {batchGroups.length === 0 ? (
                        <div style={{ padding: "20px", color: "#6b7280", textAlign: "center", fontSize: "0.85em" }}>
                          No groups found.
                        </div>
                      ) : (
                        batchGroups.map((g) => {
                          const isSelected = activeGroupId === g._id;
                          const unread = unreadCounts[g._id] || 0;
                          return (
                            <div
                              key={g._id}
                              onClick={() => handleSelectBatchGroup(g)}
                              style={{
                                padding: "12px 16px", borderBottom: "1px solid #232530",
                                backgroundColor: isSelected ? "#1f2238" : "transparent",
                                borderLeft: isSelected ? "3px solid #aa3bff" : "3px solid transparent",
                                cursor: "pointer",
                                transition: "background-color 0.15s"
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = "#181a24";
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{
                                  fontWeight: isSelected ? "bold" : "600",
                                  color: isSelected ? "#aa3bff" : "#f3f4f6",
                                  fontSize: "0.88em",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                  {g.name}
                                </span>
                                {unread > 0 && !isSelected && (
                                  <div style={{
                                    backgroundColor: "#25D366", color: "white", borderRadius: "50%",
                                    minWidth: "20px", height: "20px", display: "flex", alignItems: "center",
                                    justifyContent: "center", fontSize: "0.75em", fontWeight: "bold",
                                    padding: "0 4px", flexShrink: 0, marginLeft: "8px"
                                  }}>
                                    {unread}
                                  </div>
                                )}
                              </div>
                              {g.lastMessageSnippet && (
                                <div style={{
                                  fontSize: "0.78em", color: "#9ca3af", marginTop: "4px",
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                }}>
                                  {g.lastMessageSnippet}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Chat Window Panel */}
              <div style={{ flex: 1, display: "flex", backgroundColor: "#16171d" }}>
                <ChatWindow />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}