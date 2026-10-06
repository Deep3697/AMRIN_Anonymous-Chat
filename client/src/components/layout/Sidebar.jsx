import { useEffect, useState } from "react";
import { Users, Lock } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { fetchMyGroups } from "../../api/group.api";
import { fetchMyConversations } from "../../api/conversation.api";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import socket from "../../socket/socketClient";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Sidebar() {
  const [tab, setTabState] = useState(() => localStorage.getItem("sidebar_tab") || "groups");
  const setTab = (newTab) => {
    localStorage.setItem("sidebar_tab", newTab);
    setTabState(newTab);
    
    // Auto-clear active chat if it mismatches the new tab
    const threadType = useChatStore.getState().activeThreadType;
    if (newTab === "groups" && threadType === "dm") {
      useChatStore.getState().setActiveGroupId(null);
    } else if (newTab === "dms" && threadType === "group") {
      useChatStore.getState().setActiveGroupId(null);
    }
  };
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const activeThreadType = useChatStore((s) => s.activeThreadType);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user && ["god_admin", "main_admin"].includes(user.role);

  useEffect(() => {
    // Ensure tab and active thread type are in sync on mount
    const initialThreadType = useChatStore.getState().activeThreadType;
    const initialTab = isAdmin ? "dms" : tab;
    
    if (initialTab === "groups" && initialThreadType === "dm") {
      setActiveGroupId(null);
    } else if (initialTab === "dms" && initialThreadType === "group") {
      setActiveGroupId(null);
    }

    if (!socket.connected) {
      socket.connect();
    }

    fetchMyGroups().then((res) => {
      const gList = res.data.groups || [];
      // Reconcile: if the server returned a group the user was previously kicked from,
      // it means an admin re-added them — clear it from the kicked list
      const kickedGroups = JSON.parse(localStorage.getItem("amrin_kicked_groups") || "[]");
      const serverGroupIds = gList.map(g => String(g._id));
      const stillKicked = kickedGroups.filter(id => !serverGroupIds.includes(id));
      if (stillKicked.length !== kickedGroups.length) {
        localStorage.setItem("amrin_kicked_groups", JSON.stringify(stillKicked));
      }
      // Filter out groups the user is still kicked from (no server membership yet)
      const filteredList = gList.filter(g => !stillKicked.includes(String(g._id)));
      filteredList.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      setGroups(filteredList);
      setUnreadCounts((prev) => {
        const next = { ...prev };
        filteredList.forEach(g => {
          if (g.unreadCount > 0) next[g._id] = g.unreadCount;
        });
        return next;
      });

      // Safety check: If activeGroupId points to a group the user doesn't belong to, switch to first valid group
      if (activeThreadType === "group" && activeGroupId && filteredList.length > 0) {
        const hasAccess = filteredList.some((g) => String(g._id) === String(activeGroupId));
        if (!hasAccess && !isAdmin) {
          setActiveGroupId(filteredList[0]._id, "group", filteredList[0].name);
        }
      }
    }).catch((err) => console.error("Sidebar fetch failed:", err));

    fetchMyConversations().then((res) => {
      const cList = res.data.conversations || [];
      cList.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0));
      setConversations(cList);
      setUnreadCounts((prev) => {
        const next = { ...prev };
        cList.forEach((c) => {
          if (c.unreadCount > 0) next[c._id] = c.unreadCount;
        });
        return next;
      });
    }).catch((err) => console.error("Sidebar fetch failed:", err));
  }, []);

  // Expose fetchMyConversations to window/global if ChatPage needs to trigger a refresh
  useEffect(() => {
    window.refreshSidebarDMs = () => {
      fetchMyConversations().then((res) => {
        const cList = res.data.conversations || [];
        cList.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0));
        setConversations(cList);
      }).catch((err) => console.error("Sidebar fetch failed:", err));
    };
    return () => { delete window.refreshSidebarDMs; };
  }, []);

  // Clear unread count when clicking a chat
  useEffect(() => {
    if (activeGroupId) {
      setUnreadCounts((prev) => ({ ...prev, [activeGroupId]: 0 }));
    }
  }, [activeGroupId]);

  // Handle cross-component tab switching (e.g. from MessageBubble or ChatPage)
  useEffect(() => {
    const handleSwitchToDms = () => {
      localStorage.setItem("sidebar_tab", "dms");
      setTabState("dms");
    };
    window.addEventListener("switch-to-dms", handleSwitchToDms);
    return () => window.removeEventListener("switch-to-dms", handleSwitchToDms);
  }, []);

  // ── Real-time: user:kicked — remove group immediately when kicked ──
  useEffect(() => {
    const handleUserKicked = ({ userId, groupId }) => {
      const myId = String(user?.id || user?._id || user?.sub);
      if (String(userId) === myId) {
        // Persist kicked group so it stays removed across refreshes until server re-adds membership
        const kickedGroups = JSON.parse(localStorage.getItem("amrin_kicked_groups") || "[]");
        const kickedGroupId = groupId || (activeGroupId && String(activeGroupId));
        if (kickedGroupId && !kickedGroups.includes(kickedGroupId)) {
          kickedGroups.push(kickedGroupId);
          localStorage.setItem("amrin_kicked_groups", JSON.stringify(kickedGroups));
        }

        // Remove group from sidebar immediately
        setGroups((prev) => prev.filter((g) => String(g._id) !== String(kickedGroupId)));

        // If the user is viewing the kicked group, clear active chat
        if (String(activeGroupId) === String(kickedGroupId)) {
          setActiveGroupId(null);
        }
      }
    };

    const handleUserReadded = ({ userId, groupId }) => {
      const myId = String(user?.id || user?._id || user?.sub);
      if (String(userId) === myId) {
        // Fetch groups again to reflect the new group
        fetchMyGroups().then((res) => {
          const gList = res.data.groups || [];
          const kickedGroups = JSON.parse(localStorage.getItem("amrin_kicked_groups") || "[]");
          const serverGroupIds = gList.map(g => String(g._id));
          const stillKicked = kickedGroups.filter(id => !serverGroupIds.includes(id));
          if (stillKicked.length !== kickedGroups.length) {
            localStorage.setItem("amrin_kicked_groups", JSON.stringify(stillKicked));
          }
          const filteredList = gList.filter(g => !stillKicked.includes(String(g._id)));
          filteredList.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
          setGroups(filteredList);
        }).catch((err) => console.error("Readded fetch failed:", err));
      }
    };

    socket.on("user:kicked", handleUserKicked);
    socket.on("user:readded", handleUserReadded);
    return () => {
      socket.off("user:kicked", handleUserKicked);
      socket.off("user:readded", handleUserReadded);
    };
  }, [activeGroupId, user, setActiveGroupId]);

  // Handle socket real-time updates
  useEffect(() => {
    const handleNewMessage = (m) => {
      const isGroup = m.threadType === "group";
      const snippet = m.text || `[${m.attachment?.type || "media"}]`;
      const nowIso = m.createdAt || new Date().toISOString();
      const isOwn = String(m.senderId) === String(user?.id || user?._id || user?.sub);

      if (isGroup) {
        setGroups((prev) => {
          const idx = prev.findIndex((g) => String(g._id) === String(m.threadId));
          if (idx === -1) return prev;
          const updatedGroup = { ...prev[idx], lastMessageSnippet: snippet, lastMessageAt: nowIso };
          const newList = [...prev];
          newList.splice(idx, 1);
          newList.unshift(updatedGroup);
          return newList;
        });
      } else {
        setConversations((prev) => {
          const idx = prev.findIndex((c) => String(c._id) === String(m.threadId));
          if (idx === -1) {
            // New conversation arrived: refresh conversations list so it appears at top immediately!
            fetchMyConversations().then((res) => {
              const cList = res.data.conversations || [];
              cList.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0));
              setConversations(cList);
              setUnreadCounts((uPrev) => {
                const uNext = { ...uPrev };
                cList.forEach((c) => {
                  if (c.unreadCount > 0) uNext[c._id] = c.unreadCount;
                });
                return uNext;
              });
            }).catch((err) => console.error("Sidebar fetch failed:", err));
            return prev;
          }
          const updatedConvo = { ...prev[idx], lastMessageSnippet: snippet, lastMessageAt: nowIso };
          const newList = [...prev];
          newList.splice(idx, 1);
          newList.unshift(updatedConvo);
          return newList;
        });
      }

      // If the chat is not currently open and not own message, increment unread count
      if (!isOwn && String(activeGroupId) !== String(m.threadId)) {
        setUnreadCounts((prev) => ({ ...prev, [m.threadId]: (prev[m.threadId] || 0) + 1 }));
      }
    };

    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [activeGroupId, user]);

  // For admin: only show private (no groups tab). For normal users: groups + private
  const activeTab = isAdmin ? "dms" : tab;
  const hasGroupUnread = groups.some(g => unreadCounts[g._id] > 0);
  const hasDMUnread = conversations.some(c => unreadCounts[c._id] > 0);

  // Panel border-radius depends on which tab is active
  const panelClassName = `sidebar-conv-panel ${
    activeTab === "dms" ? "sidebar-conv-panel--private" : ""
  } ${isAdmin ? "sidebar-conv-panel--admin" : ""}`;

  return (
    <div className="chat-sidebar">
      {/* Tabs */}
      {isAdmin ? (
        /* Admin: only private tab header */
        <div className="sidebar-tabs-row">
          <button
            className="sidebar-tab-btn sidebar-tab-btn--active sidebar-tab-btn--private"
            style={{ cursor: "default" }}
          >
            <Lock size={13} />
            PRIVATE
            {hasDMUnread && <span className="sidebar-tab-unread" />}
          </button>
        </div>
      ) : (
        /* Normal user: groups + private tabs */
        <div className="sidebar-tabs-row">
          <button
            className={`sidebar-tab-btn ${activeTab === "groups" ? "sidebar-tab-btn--active" : ""}`}
            onClick={() => setTab("groups")}
          >
            <Users size={13} />
            GROUPS
            {hasGroupUnread && <span className="sidebar-tab-unread" />}
          </button>
          <button
            className={`sidebar-tab-btn sidebar-tab-btn--private ${activeTab === "dms" ? "sidebar-tab-btn--active" : ""}`}
            onClick={() => setTab("dms")}
          >
            <Lock size={13} />
            PRIVATE
            {hasDMUnread && <span className="sidebar-tab-unread" />}
          </button>
        </div>
      )}

      {/* Conversation Panel */}
      <div className={panelClassName}>
        <div className="conv-list">
          {activeTab === "groups" ? (
            groups.length === 0 ? (
              <div className="conv-empty">No groups joined yet</div>
            ) : (
              groups.map((g, idx) => {
                const isSelected = activeGroupId === g._id && activeThreadType === "group";
                const hasUnread = unreadCounts[g._id] > 0 && !isSelected;
                return (
                  <div
                    key={g._id}
                    className={`conv-row ${isSelected ? "conv-row--active" : ""} ${hasUnread ? "conv-row--unread" : ""}`}
                    onClick={() => {
                      setActiveGroupId(g._id, "group", g.name);
                      window.dispatchEvent(new Event("open-mobile-chat"));
                    }}
                    style={{ animationDelay: `${idx * 35}ms` }}
                  >
                    <span className="conv-signal-mark conv-signal-mark--group" />
                    <div className="conv-row-content">
                      <div className="conv-row-top">
                        <span className="conv-row-name">{g.name}</span>
                        <span className="conv-row-time">
                          {formatRelativeTime(g.lastMessageAt)}
                        </span>
                      </div>
                      {g.lastMessageSnippet && (
                        <div className="conv-row-preview">{g.lastMessageSnippet}</div>
                      )}
                    </div>
                    {hasUnread && (
                      <span className="conv-row-badge">{unreadCounts[g._id]}</span>
                    )}
                  </div>
                );
              })
            )
          ) : (
            conversations.length === 0 ? (
              <div className="conv-empty">No private conversations yet</div>
            ) : (
              conversations.map((c, idx) => {
                const other = c.participants?.find((p) => String(p._id) !== String(user?.id || user?._id || user?.sub));
                const title = other?.anonymousName || "Anonymous";
                const isSelected = activeGroupId === c._id && activeThreadType === "dm";
                const hasUnread = unreadCounts[c._id] > 0 && !isSelected;
                return (
                  <div
                    key={c._id}
                    className={`conv-row ${isSelected ? "conv-row--active" : ""} ${hasUnread ? "conv-row--unread" : ""}`}
                    onClick={() => {
                      setActiveGroupId(c._id, "dm", title);
                      window.dispatchEvent(new Event("open-mobile-chat"));
                      setUnreadCounts((prev) => ({ ...prev, [c._id]: 0 }));
                      axiosClient.patch(`/conversations/${c._id}/read`).catch((err) => console.error("Sidebar fetch failed:", err));
                    }}
                    style={{ animationDelay: `${idx * 35}ms` }}
                  >
                    <span className="conv-signal-mark conv-signal-mark--online" />
                    <div className="conv-row-content">
                      <div className="conv-row-top">
                        <span className="conv-row-name">{title}</span>
                        <span className="conv-row-time">
                          {formatRelativeTime(c.lastMessageAt || c.updatedAt)}
                        </span>
                      </div>
                      {c.lastMessageSnippet && (
                        <div className="conv-row-preview">{c.lastMessageSnippet}</div>
                      )}
                    </div>
                    {hasUnread && (
                      <span className="conv-row-badge">{unreadCounts[c._id]}</span>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}