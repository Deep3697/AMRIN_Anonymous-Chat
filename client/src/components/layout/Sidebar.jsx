import { useEffect, useState } from "react";
import { fetchMyGroups } from "../../api/group.api";
import { fetchMyConversations } from "../../api/conversation.api";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";

export default function Sidebar() {
  const [tab, setTab] = useState("groups"); // "groups" | "dms"
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const activeThreadType = useChatStore((s) => s.activeThreadType);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (tab === "groups") {
      fetchMyGroups().then((res) => setGroups(res.data.groups || [])).catch(() => {});
    } else {
      fetchMyConversations().then((res) => setConversations(res.data.conversations || [])).catch(() => {});
    }
  }, [tab]);

  // Expose fetchMyConversations to window/global if ChatPage needs to trigger a refresh
  useEffect(() => {
    window.refreshSidebarDMs = () => {
      if (tab === "dms") {
        fetchMyConversations().then((res) => setConversations(res.data.conversations || [])).catch(() => {});
      }
    };
    return () => { delete window.refreshSidebarDMs; };
  }, [tab]);

  return (
    <div style={{ width: "300px", borderRight: "1px solid #ccc", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Switcher Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9fa" }}>
        <button
          onClick={() => setTab("groups")}
          style={{
            flex: 1,
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
        </button>
        <button
          onClick={() => setTab("dms")}
          style={{
            flex: 1,
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
        </button>
      </div>

      {/* List Container */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "groups" ? (
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
                  <div style={{ fontWeight: "bold", marginBottom: "4px", color: isSelected ? "#007bff" : "#333" }}>
                    {g.name}
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
              const other = c.participants?.find((p) => String(p._id) !== String(user?._id || user?.sub));
              const title = other?.anonymousName || "Anonymous";
              const isSelected = activeGroupId === c._id && activeThreadType === "dm";
              return (
                <div
                  key={c._id}
                  onClick={() => setActiveGroupId(c._id, "dm", title)}
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                    backgroundColor: isSelected ? "#f0f7ff" : "transparent",
                    cursor: "pointer",
                    borderLeft: isSelected ? "4px solid #007bff" : "4px solid transparent"
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "4px", color: isSelected ? "#007bff" : "#333" }}>
                    🔒 {title}
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