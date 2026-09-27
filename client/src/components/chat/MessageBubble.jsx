// client/src/components/chat/MessageBubble.jsx
import { useEffect, useRef, useState } from "react";
import socket from "../../socket/socketClient";
import axiosClient from "../../api/axiosClient";
import { submitReport } from "../../api/admin.api";
import { startConversation } from "../../api/conversation.api";
import { useChatStore } from "../../store/chatStore";
import PollView from "./PollView";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function MessageBubble({ message, isOwnMessage, userRole, threadType }) {
  const ref = useRef();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [userPopupPos, setUserPopupPos] = useState({ x: 0, y: 0 });

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [seenByViewers, setSeenByViewers] = useState(null); // null = hidden, [] = loading/empty, [...] = loaded

  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);

  const isDM = threadType === "dm";

  useEffect(() => {
    if (!isOwnMessage && message._id && !message.isOptimistic && !String(message._id).startsWith("temp_")) {
      socket.emit("message:seen", { messageId: message._id });
    }
  }, [message._id, isOwnMessage, message.isOptimistic]);

  // Close context menu on click anywhere
  useEffect(() => {
    function handleClickOutside() {
      setShowContextMenu(false);
      setShowUserPopup(false);
    }
    if (showContextMenu || showUserPopup) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showContextMenu, showUserPopup]);

  function handleContextMenu(e) {
    e.preventDefault();
    if (message.isOptimistic || message.isDeleted) return;
    setShowContextMenu(true);
    setContextPos({ x: e.clientX, y: e.clientY });
  }

  function handleStartEdit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const withinWindow = Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000;
    if (!withinWindow) {
      setModalConfig({ type: "alert", title: "Edit Error", message: "You can only edit messages within 5 minutes of sending." });
      setShowContextMenu(false);
      return;
    }
    setEditText(message.text);
    setIsEditing(true);
    setShowContextMenu(false);
  }

  function handleSaveEdit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!editText.trim()) return;
    socket.emit("message:edit", { messageId: message._id, newText: editText.trim() });
    setIsEditing(false);
  }

  function handleCancelEdit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setIsEditing(false);
    setEditText("");
  }

  function handleDelete(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm",
      title: "Delete Message",
      message: "Are you sure you want to delete this message?",
      onConfirm: () => {
        socket.emit("message:delete", { messageId: message._id });
      }
    });
    setShowContextMenu(false);
  }

  function handleReport(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalInput("");
    setModalConfig({
      type: "prompt",
      title: `Report ${message.anonymousNameSnapshot}`,
      message: `Report this message:\n"${message.text}"`,
      placeholder: "Enter a reason...",
      onConfirm: async (reason) => {
        if (!reason?.trim()) return;
        try {
          await submitReport(message.senderId, message.threadId, reason);
          setTimeout(() => {
            setModalConfig({ type: "alert", title: "Success", message: "Report submitted successfully." });
          }, 100);
        } catch (err) {
          setTimeout(() => {
            setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to submit report" });
          }, 100);
        }
      }
    });
    setShowContextMenu(false);
  }

  function handleMute(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm",
      title: "Mute User",
      message: `Mute ${message.anonymousNameSnapshot} for 24 hours?`,
      onConfirm: () => {
        socket.emit("user:mute", { userId: message.senderId, groupId: message.threadId, durationMinutes: 1440 });
      }
    });
    setShowContextMenu(false);
  }

  function handleKick(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm",
      title: "Kick User",
      message: `Are you sure you want to kick ${message.anonymousNameSnapshot} from this group?`,
      onConfirm: () => {
        socket.emit("user:kick", { userId: message.senderId, groupId: message.threadId });
      }
    });
    setShowContextMenu(false);
  }

  // Block user in DM
  function handleBlockUser(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm",
      title: "Block User",
      message: `Block ${message.anonymousNameSnapshot}? They won't be able to message you anymore.`,
      onConfirm: async () => {
        try {
          await axiosClient.post("/block", { blockedId: message.senderId });
          setModalConfig({ type: "alert", title: "Blocked", message: `${message.anonymousNameSnapshot} has been blocked.` });
        } catch (err) {
          setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to block user" });
        }
      }
    });
    setShowContextMenu(false);
  }

  // Click on sender name → popup with DM / Report options
  function handleNameClick(e) {
    e.stopPropagation();
    if (isOwnMessage || message.isOptimistic) return;
    // In DMs, no name-click popup needed (you already know who they are)
    if (isDM) return;
    setShowUserPopup(true);
    setUserPopupPos({ x: e.clientX, y: e.clientY });
  }

  async function handleDMFromPopup(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      const res = await startConversation(message.senderId);
      const convo = res.data.conversation;
      setActiveGroupId(convo._id, "dm", convo.otherParticipantName || message.anonymousNameSnapshot);
      setShowUserPopup(false);
    } catch (err) {
      setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to start DM" });
    }
  }

  function handleReportFromPopup(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setShowUserPopup(false);
    handleReport();
  }

  function handlePromote(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm",
      title: "Promote to Monitor",
      message: `Promote ${message.anonymousNameSnapshot} to Chat Monitor?`,
      onConfirm: () => {
        socket.emit("user:promote", { userId: message.senderId, groupId: message.threadId });
      }
    });
    setShowUserPopup(false);
  }

  function handleDemote(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm",
      title: "Demote to Member",
      message: `Demote ${message.anonymousNameSnapshot} back to Member?`,
      onConfirm: () => {
        socket.emit("user:demote", { userId: message.senderId, groupId: message.threadId });
      }
    });
    setShowUserPopup(false);
  }

  async function handleShowSeenBy(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setShowContextMenu(false);
    try {
      const res = await axiosClient.get(`/messages/${message._id}/seen-by`);
      setSeenByViewers(res.data.viewers || []);
    } catch {
      setSeenByViewers([]);
    }
  }

  const isAdmin = ["god_admin", "main_admin"].includes(userRole);
  const isMonitor = userRole === "chat_monitor";
  const canEdit = isOwnMessage && !message.isOptimistic && (Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000);

  const isTargetMonitor = message.anonymousNameSnapshot?.endsWith("(monitor)");
  const isTargetAdmin = message.anonymousNameSnapshot === "Admin" || message.anonymousNameSnapshot === "God_Admin";

  // Seen label: DM shows "Seen" / "Not Seen", group shows "Seen by N"
  function renderSeenLabel() {
    if (!isOwnMessage) return null;
    if (isDM) {
      const seenCount = message.seenBy?.length || 0;
      return seenCount > 0
        ? <span style={{ fontSize: "0.75em", color: "#28a745" }}>✓✓ Seen</span>
        : <span style={{ fontSize: "0.75em", color: "#999" }}>✓ Not Seen</span>;
    }
    return null; // Group chat read receipts are only shown in the options menu
  }

  return (
    <div ref={ref} style={{ position: "relative" }} onContextMenu={handleContextMenu}>
      {message.type === "system" ? (
        <div style={{
          textAlign: "center", padding: "6px 0",
          fontSize: "0.8em", color: "#888", fontStyle: "italic"
        }}>
          <span style={{
            backgroundColor: "#f0f0f0", padding: "3px 12px", borderRadius: "10px",
            display: "inline-block"
          }}>
            {message.text}
          </span>
        </div>
      ) : message.isDeleted ? (
        <em style={{ color: "#888" }}>This message was deleted{message.deletedBySnapshot ? ` by ${message.deletedBySnapshot}` : ""}</em>
      ) : message.type === "poll" ? (
        <PollView message={message} />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {isEditing ? (
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(e); if (e.key === "Escape") handleCancelEdit(e); }}
                  autoFocus
                  style={{
                    width: "100%", padding: "6px 10px", borderRadius: "4px",
                    border: "1px solid #007bff", fontSize: "0.95em", outline: "none"
                  }}
                />
                <div style={{ marginTop: "4px", display: "flex", gap: "6px" }}>
                  <button type="button" onClick={handleSaveEdit} style={editBtnStyle}>Save</button>
                  <button type="button" onClick={handleCancelEdit} style={{ ...editBtnStyle, backgroundColor: "#6c757d" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ margin: "0 0 2px 0", lineHeight: "1.4" }}>
                <strong
                  onClick={handleNameClick}
                  style={{
                    cursor: (isOwnMessage || isDM) ? "default" : "pointer",
                    textDecoration: (isOwnMessage || isDM) ? "none" : "underline",
                    textDecorationStyle: "dotted",
                  }}
                >
                  {message.anonymousNameSnapshot}:
                </strong>{" "}
                {message.text}
              </p>
            )}
          </div>

          {/* Attachments */}
          {message.attachment && (
            <div style={{ marginTop: "6px", marginBottom: "6px" }}>
              {message.attachment.type === "image" && (
                <img
                  src={message.attachment.url}
                  alt="Attachment"
                  style={{ maxWidth: "260px", maxHeight: "260px", borderRadius: "6px", display: "block" }}
                />
              )}
              {message.attachment.type === "video" && (
                <video src={message.attachment.url} controls style={{ maxWidth: "260px", borderRadius: "6px" }} />
              )}
              {message.attachment.type === "audio" && (
                <audio src={message.attachment.url} controls style={{ display: "block", marginTop: "4px" }} />
              )}
              {message.attachment.type === "file" && (
                <a href={message.attachment.url} target="_blank" rel="noreferrer" style={{ display: "block", padding: "8px 12px", backgroundColor: "#f0f0f0", borderRadius: "6px", textDecoration: "none", color: "#333" }}>
                  📄 {message.attachment.fileName || "Download file"}
                </a>
              )}
              {message.attachment.caption && (
                <p style={{ fontSize: "0.9em", color: "#555", marginTop: "4px" }}>{message.attachment.caption}</p>
              )}
            </div>
          )}

          {/* Timestamp + Seen status row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: isOwnMessage ? "flex-end" : "flex-start", gap: "6px", marginTop: "2px" }}>
            {message.isEdited && <span style={{ fontSize: "0.7em", color: "#999", fontStyle: "italic" }}>edited</span>}
            <span style={{ fontSize: "0.7em", color: "#999" }}>
              {formatTime(message.createdAt)}
            </span>
            {renderSeenLabel()}
          </div>
        </>
      )}

      {/* Right-click context menu */}
      {showContextMenu && (
        <div style={{
          position: "fixed", left: contextPos.x, top: contextPos.y,
          backgroundColor: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          border: "1px solid #e0e0e0", borderRadius: "8px", zIndex: 9999,
          minWidth: "160px", overflow: "hidden", animation: "fadeIn 0.1s ease"
        }}>
          {isDM ? (
            /* ── DM Context Menu: No privileges, equal for all ── */
            <>
              {isOwnMessage ? (
                <>
                  {canEdit && (
                    <button type="button" onClick={handleStartEdit} style={menuBtnStyle}>✏️ Edit</button>
                  )}
                  <button type="button" onClick={handleDelete} style={menuBtnStyle}>🗑️ Delete</button>
                  <div style={{ ...menuBtnStyle, cursor: "default" }}>
                    {(message.seenBy?.length || 0) > 0
                      ? <span style={{ color: "#28a745" }}>✓✓ Seen</span>
                      : <span style={{ color: "#999" }}>✓ Not Seen</span>
                    }
                  </div>
                </>
              ) : (
                <>
                  <button type="button" onClick={handleBlockUser} style={{ ...menuBtnStyle, color: "#dc3545" }}>🚫 Block User</button>
                </>
              )}
            </>
          ) : (
            /* ── Group Context Menu: Full privileges based on role ── */
            <>
              {/* Own message actions */}
              {isOwnMessage && (
                <>
                  {canEdit && (
                    <button type="button" onClick={handleStartEdit} style={menuBtnStyle}>✏️ Edit</button>
                  )}
                  <button type="button" onClick={handleDelete} style={menuBtnStyle}>🗑️ Delete</button>
                  <button type="button" onClick={handleShowSeenBy} style={menuBtnStyle}>👁️ Seen by {message.seenBy?.length || 0}</button>
                </>
              )}

              {/* Other's message actions */}
              {!isOwnMessage && (
                <>
                  {/* Report: visible for members and chat_monitors, NOT for admins */}
                  {!isAdmin && (
                    <button type="button" onClick={handleReport} style={menuBtnStyle}>🚩 Report</button>
                  )}

                  {/* Admin/Monitor moderation tools */}
                  {(isAdmin || isMonitor) && (
                    <>
                      <button type="button" onClick={handleDelete} style={menuBtnStyle}>🗑️ Delete Msg</button>
                      <button type="button" onClick={handleMute} style={menuBtnStyle}>🔇 Mute 24h</button>
                    </>
                  )}
                  {isAdmin && (
                    <button type="button" onClick={handleKick} style={{ ...menuBtnStyle, color: "#dc3545" }}>🥾 Kick User</button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Username click popup: DM / Report (only for group chats) */}
      {showUserPopup && !isDM && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed", left: userPopupPos.x, top: userPopupPos.y,
            backgroundColor: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            border: "1px solid #e0e0e0", borderRadius: "8px", zIndex: 9999,
            minWidth: "150px", overflow: "hidden"
          }}
        >
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #eee", fontWeight: "bold", fontSize: "0.85em", color: "#333" }}>
            {message.anonymousNameSnapshot}
          </div>
          <button type="button" onClick={handleDMFromPopup} style={menuBtnStyle}>💬 Send DM</button>
          {!isAdmin && (
            <button type="button" onClick={handleReportFromPopup} style={menuBtnStyle}>🚩 Report User</button>
          )}
          {isAdmin && !isTargetAdmin && (
            isTargetMonitor ? (
              <button type="button" onClick={handleDemote} style={menuBtnStyle}>⬇️ Demote to Member</button>
            ) : (
              <button type="button" onClick={handlePromote} style={menuBtnStyle}>⬆️ Promote to Monitor</button>
            )
          )}
        </div>
      )}

      {/* Custom Modal for Alerts/Confirms/Prompts */}
      {modalConfig && (
        <div
          onClick={(e) => { e.stopPropagation(); setModalConfig(null); }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 10000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white", padding: "20px", borderRadius: "8px",
              width: "320px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            <h4 style={{ margin: "0 0 10px", color: "#333" }}>{modalConfig.title}</h4>
            {modalConfig.message && (
              <p style={{ margin: "0 0 16px", fontSize: "0.9em", color: "#555", whiteSpace: "pre-wrap" }}>
                {modalConfig.message}
              </p>
            )}

            {modalConfig.type === "prompt" && (
              <input
                autoFocus
                type="text"
                placeholder={modalConfig.placeholder}
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                style={{
                  width: "100%", padding: "8px", marginBottom: "16px", boxSizing: "border-box",
                  borderRadius: "4px", border: "1px solid #ccc", outline: "none"
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    modalConfig.onConfirm(modalInput);
                    setModalConfig(null);
                  }
                }}
              />
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              {(modalConfig.type === "confirm" || modalConfig.type === "prompt") && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setModalConfig(null); }}
                  style={{ padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: "#e2e6ea", color: "#333", fontWeight: "bold" }}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (modalConfig.type === "prompt") {
                    modalConfig.onConfirm(modalInput || "");
                  } else if (modalConfig.onConfirm) {
                    modalConfig.onConfirm();
                  }
                  setModalConfig(null);
                }}
                style={{ padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: "#007bff", color: "white", fontWeight: "bold" }}
              >
                {modalConfig.type === "alert" ? "OK" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seen By Viewer List Modal */}
      {seenByViewers !== null && (
        <div
          onClick={() => setSeenByViewers(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 10001
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white", padding: "0", borderRadius: "10px",
              width: "300px", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              maxHeight: "400px", overflow: "hidden", display: "flex", flexDirection: "column"
            }}
          >
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderBottom: "1px solid #eee"
            }}>
              <h4 style={{ margin: 0, color: "#333", fontSize: "0.95em" }}>👁️ Seen by {seenByViewers.length}</h4>
              <button
                onClick={() => setSeenByViewers(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2em", color: "#999", lineHeight: 1 }}
              >✕</button>
            </div>
            <div style={{ overflowY: "auto", maxHeight: "320px", padding: "8px 0" }}>
              {seenByViewers.length === 0 ? (
                <div style={{ padding: "20px", color: "#888", textAlign: "center", fontSize: "0.9em" }}>
                  No one has seen this message yet
                </div>
              ) : (
                seenByViewers.map((v) => (
                  <div key={v._id} style={{
                    padding: "10px 18px", display: "flex", alignItems: "center", gap: "10px",
                    borderBottom: "1px solid #f5f5f5"
                  }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      backgroundColor: "#e0e7ff", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "0.8em", fontWeight: "bold", color: "#4f46e5"
                    }}>
                      {(v.anonymousName || "?")[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: "0.9em", fontWeight: "500", color: "#333" }}>
                      {v.anonymousName || "Unknown"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const menuBtnStyle = {
  display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
  background: "none", border: "none", cursor: "pointer", fontSize: "0.9em",
  borderBottom: "1px solid #f0f0f0", transition: "background-color 0.15s ease",
  color: "#333"
};

const editBtnStyle = {
  padding: "4px 12px", fontSize: "0.8em", cursor: "pointer",
  border: "none", borderRadius: "4px", color: "white", backgroundColor: "#007bff",
};