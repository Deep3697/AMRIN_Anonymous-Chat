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
import AssignMonitorPanel from "../components/admin/AssignMonitorPanel";
import ChatWindow from "../components/chat/ChatWindow";

import "./admin.css";

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
  const [actionNotification, setActionNotification] = useState(null);

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
      if (useChatStore.getState().activeThreadType === "dm") {
        setActiveGroupId(null);
      }
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
    // Prevent state leakage on mount
    const threadType = useChatStore.getState().activeThreadType;
    if (activeTab === "batches" && threadType === "dm") {
      setActiveGroupId(null);
    }

    const handleActionSuccess = ({ action }) => {
      const labels = { muted: "🔇 User muted", kicked: "🚫 User kicked", added: "✅ User added", promoted: "⬆️ User promoted to monitor", demoted: "⬇️ User demoted to member" };
      setActionNotification(labels[action] || `✅ Action: ${action}`);
      setTimeout(() => setActionNotification(null), 3000);
    };

    socket.on("user:actionSuccess", handleActionSuccess);

    return () => {
      socket.off("user:actionSuccess", handleActionSuccess);
      socket.disconnect();
    };
  }, [activeTab, setActiveGroupId]);

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
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "batches_mgmt", label: "Batches & Assignment", icon: "🎓" },
    { id: "users", label: "User Management", icon: "👥" },
    { id: "moderation", label: "Moderation Tools", icon: "🛡️" },
    { id: "reports", label: "Reports & Help", icon: "🚩" },
    { id: "settings", label: "Canteens & Settings", icon: "🍽️" },
    { id: "batches", label: "Batches & Chats", icon: "💬" },
  ];

  return (
    <div className="admin-root">
      {/* ── Topbar ── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-brand-mark">
            <span /><span /><span /><span />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="admin-topbar-title">
                {isGodAdmin ? "God Admin Dashboard" : "Admin Dashboard"}
              </span>
              <span className={`admin-topbar-badge ${isGodAdmin ? "admin-topbar-badge--god" : "admin-topbar-badge--admin"}`}>
                {isGodAdmin ? "God Admin" : "Admin"}
              </span>
            </div>
            <div className="admin-topbar-subtitle">
              Campus Chat Management Console
            </div>
          </div>
        </div>

        <div className="admin-topbar-right">
          <div className="admin-topbar-user">
            Logged in as: <strong>{user?.anonymousName || "Admin"}</strong>
            <span style={{ color: "var(--admin-text-3)" }}>({user?.role})</span>
          </div>
          <button
            onClick={() => {
              setDmUnreadDot(false);
              if (useChatStore.getState().activeThreadType === "group") {
                setActiveGroupId(null);
              }
              navigate("/chat");
            }}
            className="admin-topbar-btn admin-topbar-btn--chat"
          >
            ← Go to Chat
            {dmUnreadDot && <span className="admin-unread-dot" />}
          </button>
          <button
            onClick={handleLogout}
            className="admin-topbar-btn admin-topbar-btn--logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Body: Left Sidebar + Main Content ── */}
      <div className="admin-body">
        {/* ── Left Sidebar for Features ── */}
        <div className="admin-sidebar">
          <div className="admin-sidebar-header">
            Admin Features
          </div>

          <div className="admin-sidebar-list">
            {sidebarTabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`admin-nav-btn ${isActive ? "admin-nav-btn--active" : ""}`}
                >
                  <span className="admin-nav-icon">{t.icon}</span>
                  <span className="admin-nav-label">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className={`admin-main ${activeTab === "batches" ? "admin-main--flush" : ""}`}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div style={{ maxWidth: "1200px" }}>
              <div className="admin-page-header">
                <h2 className="admin-page-title">
                  {isGodAdmin ? "God Admin" : "Admin"} Platform Overview
                </h2>
                <p className="admin-page-subtitle">
                  Real-time database statistics, system events, and platform controls.
                </p>
              </div>

              {/* Stat Cards */}
              <div className="admin-stats-grid">
                {[
                  { label: "TOTAL USERS", value: stats?.totalUsers ?? "—", color: "var(--admin-primary)", glow: "rgba(59, 184, 214, 0.1)", icon: "👥" },
                  { label: "ACTIVE GROUPS", value: stats?.activeGroups ?? "—", color: "var(--admin-success)", glow: "rgba(53, 210, 161, 0.1)", icon: "💬" },
                  { label: "BATCHES", value: stats?.batchCount ?? "—", color: "var(--admin-warning)", glow: "rgba(244, 178, 91, 0.1)", icon: "🎓", clickable: true, tab: "batches_mgmt" },
                  { label: "MESSAGES TODAY", value: stats?.messagesToday ?? "—", color: "var(--admin-accent)", glow: "rgba(43, 208, 229, 0.1)", icon: "✉️" },
                ].map((card) => (
                  <div
                    key={card.label}
                    onClick={card.clickable ? () => handleTabChange(card.tab) : undefined}
                    className={`admin-stat-card ${card.clickable ? "admin-stat-card--clickable" : ""}`}
                    style={{
                      "--card-glow": card.glow,
                      borderLeftColor: card.color,
                      borderLeftWidth: "3px",
                    }}
                  >
                    <div className="admin-stat-card-top">
                      <span className="admin-stat-label">{card.label}</span>
                      <span className="admin-stat-icon">{card.icon}</span>
                    </div>
                    <div className="admin-stat-value" style={{ color: card.color }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Status Counters Row */}
              <div className="admin-counters-grid">
                {[
                  { label: "Pending Help", value: stats?.pendingHelp ?? 0, color: "var(--admin-accent)", tab: "reports" },
                  { label: "Pending Reports", value: stats?.pendingReports ?? 0, color: "var(--admin-danger)", tab: "reports" },
                  { label: "Muted Users", value: stats?.mutedUsers ?? 0, color: "var(--admin-warning)", tab: "moderation" },
                  { label: "Banned Users", value: stats?.bannedUsers ?? 0, color: "var(--admin-danger)", tab: "moderation" },
                ].map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleTabChange(item.tab)}
                    className="admin-counter-card"
                  >
                    <div>
                      <div className="admin-counter-label">{item.label}</div>
                      <div className="admin-counter-value" style={{ color: item.color }}>{item.value}</div>
                    </div>
                    <span className="admin-counter-arrow">View →</span>
                  </div>
                ))}
              </div>

              {/* Recent Activity + Quick Actions */}
              <div className="admin-two-col">
                {/* Recent Activity Feed */}
                <div className="admin-panel">
                  <div className="admin-panel-header">
                    <h3 className="admin-panel-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="admin-live-pulse">
                        <span className="admin-live-dot" />
                        Live
                      </span>
                      Database Activity
                    </h3>
                    <button
                      onClick={() => setRefreshKey((k) => k + 1)}
                      className="admin-refresh-btn"
                    >
                      Refresh ↻
                    </button>
                  </div>
                  {recentActivity.length === 0 ? (
                    <div className="admin-empty">
                      No recent activity recorded yet.
                    </div>
                  ) : (
                    recentActivity.map((a, i) => (
                      <div key={i} className="admin-activity-item" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="admin-activity-left">
                          <span
                            className="admin-activity-dot"
                            style={{ backgroundColor: a.color || "var(--admin-primary)", "--dot-color": a.color || "var(--admin-primary)" }}
                          />
                          <span>{a.text}</span>
                        </div>
                        <div className="admin-activity-time">
                          {timeAgo(a.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Action Shortcuts */}
                <div className="admin-panel">
                  <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>Quick Actions</h3>
                  {[
                    { label: "🎓 Batches & Assignment", action: () => handleTabChange("batches_mgmt"), color: "var(--admin-primary)", desc: "Create batch & assign users" },
                    { label: "👥 User Management", action: () => handleTabChange("users"), color: "var(--admin-success)", desc: "Review pending monitor requests" },
                    { label: "🚩 Review Reports & Help", action: () => handleTabChange("reports"), color: "var(--admin-danger)", desc: "Inspect user reports & open tickets" },
                    { label: "🛡️ Moderation Tools", action: () => handleTabChange("moderation"), color: "var(--admin-warning)", desc: "Manage mutes, bans, and appeals" },
                    { label: "🍽️ Manage Canteens", action: () => handleTabChange("settings"), color: "var(--admin-accent)", desc: "Configure campus food canteens" },
                    { label: "💬 Batches & Chats View", action: () => handleTabChange("batches"), color: "var(--admin-primary-bright)", desc: "Drill down into batches & live groups" },
                  ].map((qa) => (
                    <button
                      key={qa.label}
                      onClick={qa.action}
                      className="admin-quick-action"
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = qa.color}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = ""}
                    >
                      <span className="admin-quick-action-label" style={{ color: qa.color }}>{qa.label}</span>
                      <span className="admin-quick-action-desc">{qa.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BATCHES & ASSIGNMENT TAB ── */}
          {activeTab === "batches_mgmt" && (
            <div style={{ maxWidth: "1000px" }}>
              <div className="admin-page-header">
                <h2 className="admin-page-title">🎓 Batches & Structural Assignment</h2>
                <p className="admin-page-subtitle">
                  Create batches and assign student cohorts through Institute, Branch, and Division stages.
                </p>
              </div>

              <div className="admin-panel">
                <BatchCreateForm onBatchCreated={() => { setRefreshKey((k) => k + 1); loadBatches(); }} />
              </div>

              <div className="admin-panel">
                <UnassignedUsersList refreshKey={refreshKey} />
              </div>

              <div className="admin-panel">
                <AssignInstitutePanel />
              </div>

              <div className="admin-panel">
                <AssignBranchPanel />
              </div>

              <div className="admin-panel">
                <AssignDivisionPanel />
              </div>
            </div>
          )}

          {/* ── USER MANAGEMENT TAB ── */}
          {activeTab === "users" && (
            <div style={{ maxWidth: "1000px" }}>
              <div className="admin-page-header">
                <h2 className="admin-page-title">👥 User Management & Requests</h2>
                <p className="admin-page-subtitle">
                  Monitor pending role promotions, unassigned students, and group assignments.
                </p>
              </div>

              <div className="admin-panel">
                <PendingRequestsQueue />
              </div>

              <div className="admin-panel">
                <AssignMonitorPanel />
              </div>

              <div className="admin-panel">
                <UnassignedUsersList refreshKey={refreshKey} />
              </div>
            </div>
          )}

          {/* ── MODERATION TAB ── */}
          {activeTab === "moderation" && (
            <div style={{ maxWidth: "1000px" }}>
              <div className="admin-page-header">
                <h2 className="admin-page-title">🛡️ Moderation Tools</h2>
                <p className="admin-page-subtitle">
                  Enforce community guidelines, manage temporary mutes, and review permanent bans.
                </p>
              </div>

              <div className="admin-panel">
                <MutePanel />
              </div>

              <div className="admin-panel">
                <BanPanel />
              </div>

              {isGodAdmin && (
                <div className="admin-panel">
                  <BanAppealsPanel />
                </div>
              )}
            </div>
          )}

          {/* ── REPORTS & HELP TAB ── */}
          {activeTab === "reports" && (
            <div style={{ maxWidth: "1000px" }}>
              <div className="admin-page-header">
                <h2 className="admin-page-title">🚩 Reports & Help Queue</h2>
                <p className="admin-page-subtitle">
                  Review misconduct reports submitted by users and answer student help inquiries.
                </p>
              </div>

              <div className="admin-panel">
                <ReportsQueue />
              </div>

              <div className="admin-panel">
                <HelpQueuePanel />
              </div>
            </div>
          )}

          {/* ── SETTINGS & CANTEENS TAB ── */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: "1000px" }}>
              <div className="admin-page-header">
                <h2 className="admin-page-title">🍽️ Campus Settings & Canteens</h2>
                <p className="admin-page-subtitle">
                  Manage campus food spots and configure platform options.
                </p>
              </div>

              <div className="admin-panel">
                <CreateCanteenPanel />
              </div>
            </div>
          )}

          {/* ── BATCHES & CHATS DRILL-DOWN TAB ── */}
          {activeTab === "batches" && (
            <div className={`admin-batches-layout ${activeGroupId ? "has-active-chat" : ""}`} style={{ display: "flex", height: "100%", width: "100%" }}>
              {/* Batch / Group List Panel */}
              <div className="admin-batch-sidebar">
                {!selectedBatch ? (
                  <>
                    <div className="admin-batch-header">
                      <span>🎓 Batches & Groups</span>
                      <span className="admin-batch-header-count">{sortedBatchItems.length} items</span>
                    </div>
                    <div className="admin-batch-list">
                      {sortedBatchItems.length === 0 ? (
                        <div className="admin-empty">
                          No batches or groups found.
                        </div>
                      ) : (
                        sortedBatchItems.map((b) => (
                          <div
                            key={b._id}
                            onClick={() => handleSelectBatch(b)}
                            className="admin-batch-item"
                          >
                            <div className="admin-batch-item-top">
                              <div className="admin-batch-item-name">{b.label}</div>
                              {b.unreadCount > 0 && (
                                <div className="admin-unread-badge">
                                  {b.unreadCount}
                                </div>
                              )}
                            </div>
                            <div className="admin-batch-item-sub">
                              {b.subLabel}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="admin-batch-header" style={{ gap: "10px" }}>
                      <button
                        onClick={() => { setSelectedBatch(null); setActiveGroupId(null); }}
                        className="admin-back-btn"
                      >
                        ←
                      </button>
                      <div style={{ flex: 1 }}>
                        <div className="admin-batch-item-name">{selectedBatch.label}</div>
                        <div style={{ fontSize: "10px", color: "var(--admin-text-3)" }}>{batchGroups.length} associated groups</div>
                      </div>
                    </div>
                    <div className="admin-batch-list">
                      {batchGroups.length === 0 ? (
                        <div className="admin-empty">
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
                              className={`admin-group-item ${isSelected ? "admin-group-item--active" : ""}`}
                            >
                              <div className="admin-group-item-top">
                                <span className={`admin-group-name ${isSelected ? "admin-group-name--active" : ""}`}>
                                  {g.name}
                                </span>
                                {unread > 0 && !isSelected && (
                                  <div className="admin-unread-badge">
                                    {unread}
                                  </div>
                                )}
                              </div>
                              {g.lastMessageSnippet && (
                                <div className="admin-group-snippet">
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
              <div className="admin-chat-panel">
                <ChatWindow onMobileBack={() => setActiveGroupId(null)} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══ ACTION NOTIFICATION TOAST ═══ */}
      {actionNotification && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
          background: "var(--admin-surface)", border: "1px solid var(--admin-border)",
          borderRadius: "var(--admin-r-sm)", boxShadow: "var(--admin-shadow-md)",
          zIndex: 9999, animation: "slideUpFade 0.4s ease forwards"
        }}>
          <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--admin-text)" }}>{actionNotification}</span>
          <button
            onClick={() => setActionNotification(null)}
            style={{ background: "none", border: "none", color: "var(--admin-text-3)", cursor: "pointer", fontSize: 14 }}
          >✕</button>
        </div>
      )}
    </div>
  );
}