import { useEffect, useState, useRef } from "react";
import axiosClient from "../../api/axiosClient";
import { fetchMyGroups } from "../../api/group.api";
import { fetchMyConversations } from "../../api/conversation.api";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import socket from "../../socket/socketClient";

export default function Sidebar() {
  const [tab, setTabState] = useState(() => localStorage.getItem("sidebar_tab") || "groups");
  const setTab = (newTab) => {
    localStorage.setItem("sidebar_tab", newTab);
    setTabState(newTab);
  };
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const activeThreadType = useChatStore((s) => s.activeThreadType);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    fetchMyGroups().then((res) => {
      const gList = res.data.groups || [];
      gList.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      setGroups(gList);
      setUnreadCounts((prev) => {
        const next = { ...prev };
        gList.forEach(g => {
          if (g.unreadCount > 0) next[g._id] = g.unreadCount;
        });
        return next;
      });
    }).catch(() => { });

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
    }).catch(() => { });
  }, []);

  // Expose fetchMyConversations to window/global if ChatPage needs to trigger a refresh
  useEffect(() => {
    window.refreshSidebarDMs = () => {
      fetchMyConversations().then((res) => {
        const cList = res.data.conversations || [];
        cList.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0));
        setConversations(cList);
      }).catch(() => { });
    };
    return () => { delete window.refreshSidebarDMs; };
  }, []);

  // Clear unread count when clicking a chat
  useEffect(() => {
    if (activeGroupId) {
      setUnreadCounts((prev) => ({ ...prev, [activeGroupId]: 0 }));
    }
  }, [activeGroupId]);

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
            }).catch(() => { });
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

  const isAdmin = user && ["god_admin", "main_admin"].includes(user.role);
  const activeTab = isAdmin ? "dms" : tab;

  return (
    <div style={{ width: "300px", borderRight: "1px solid #ccc", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Switcher Tabs or Admin DM Header */}
      {isAdmin ? (
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid #ddd",
          backgroundColor: "#f8f9fa", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontWeight: "bold", fontSize: "0.95em", color: "#333" }}>🔒 Private Messages</span>
          <span style={{ fontSize: "0.8em", color: "#666" }}>({conversations.length})</span>
        </div>
      ) : (
        <div style={{ display: "flex", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9fa" }}>
          <button
            onClick={() => setTab("groups")}
            style={{
              flex: 1,
              position: "relative",
              padding: "12px 6px",
              border: "none",
              backgroundColor: tab === "groups" ? "#ffffff" : "transparent",
              fontWeight: tab === "groups" ? "bold" : "normal",
              borderBottom: tab === "groups" ? "3px solid #007bff" : "3px solid transparent",
              cursor: "pointer",
              color: tab === "groups" ? "#007bff" : "#555",
              fontSize: "0.9em"
            }}
          >
            Public Groups
            {groups.some(g => unreadCounts[g._id] > 0) && (
              <span style={{
                position: "absolute", top: "8px", right: "12px", width: "8px", height: "8px",
                backgroundColor: "red", borderRadius: "50%"
              }}></span>
            )}
          </button>
          <button
            onClick={() => setTab("dms")}
            style={{
              flex: 1,
              position: "relative",
              padding: "12px 6px",
              border: "none",
              backgroundColor: tab === "dms" ? "#ffffff" : "transparent",
              fontWeight: tab === "dms" ? "bold" : "normal",
              borderBottom: tab === "dms" ? "3px solid #007bff" : "3px solid transparent",
              cursor: "pointer",
              color: tab === "dms" ? "#007bff" : "#555",
              fontSize: "0.9em"
            }}
          >
            Private DMs
            {conversations.some(c => unreadCounts[c._id] > 0) && (
              <span style={{
                position: "absolute", top: "8px", right: "12px", width: "8px", height: "8px",
                backgroundColor: "red", borderRadius: "50%"
              }}></span>
            )}
          </button>
        </div>
      )}

      {/* List Container */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "groups" ? (
          groups.length === 0 ? (
            <div style={{ padding: "20px", color: "#888", textAlign: "center", fontSize: "0.9em" }}>
              No groups joined yet
            </div>
          ) : (
            groups.map((g) => {
              const isSelected = activeGroupId === g._id && activeThreadType === "group";
              return (
                <div
                  key={g._id}
                  onClick={() => setActiveGroupId(g._id, "group", g.name)}
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                    backgroundColor: isSelected ? "#f0f7ff" : "transparent",
                    cursor: "pointer",
                    borderLeft: isSelected ? "4px solid #007bff" : "4px solid transparent"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ fontWeight: "bold", color: isSelected ? "#007bff" : "#333" }}>
                      {g.name}
                    </div>
                    {unreadCounts[g._id] > 0 && !isSelected && (
                      <div style={{
                        backgroundColor: "#25D366", color: "white", borderRadius: "50%",
                        width: "20px", height: "20px", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "0.75em", fontWeight: "bold"
                      }}>
                        {unreadCounts[g._id]}
                      </div>
                    )}
                  </div>
                  {g.lastMessageSnippet && (
                    <div style={{
                      fontSize: "0.85em",
                      color: "#666",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {g.lastMessageSnippet}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          conversations.length === 0 ? (
            <div style={{ padding: "20px", color: "#888", textAlign: "center", fontSize: "0.9em" }}>
              No private conversations yet.
            </div>
          ) : (
            conversations.map((c) => {
              const other = c.participants?.find((p) => String(p._id) !== String(user?.id || user?._id || user?.sub));
              const title = other?.anonymousName || "Anonymous";
              const isSelected = activeGroupId === c._id && activeThreadType === "dm";
              return (
                <div
                  key={c._id}
                  onClick={() => {
                    setActiveGroupId(c._id, "dm", title);
                    setUnreadCounts((prev) => ({ ...prev, [c._id]: 0 }));
                    axiosClient.patch(`/conversations/${c._id}/read`).catch(() => { });
                  }}
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                    backgroundColor: isSelected ? "#f0f7ff" : "transparent",
                    cursor: "pointer",
                    borderLeft: isSelected ? "4px solid #007bff" : "4px solid transparent"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ fontWeight: "bold", color: isSelected ? "#007bff" : "#333" }}>
                      🔒 {title}
                    </div>
                    {unreadCounts[c._id] > 0 && !isSelected && (
                      <div style={{
                        backgroundColor: "#25D366", color: "white", borderRadius: "50%",
                        width: "20px", height: "20px", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "0.75em", fontWeight: "bold"
                      }}>
                        {unreadCounts[c._id]}
                      </div>
                    )}
                  </div>
                  {c.lastMessageSnippet && (
                    <div style={{
                      fontSize: "0.85em",
                      color: "#666",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {c.lastMessageSnippet}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}