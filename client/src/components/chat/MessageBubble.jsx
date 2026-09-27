// client/src/components/chat/MessageBubble.jsx
import { useEffect, useRef, useState } from "react";
import socket from "../../socket/socketClient";
import axiosClient from "../../api/axiosClient";
import { submitReport } from "../../api/admin.api";
import { startConversation } from "../../api/conversation.api";
import { useChatStore } from "../../store/chatStore";
import PollView from "./PollView";

export default function MessageBubble({ message, isOwnMessage, userRole }) {
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

  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);

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

  // Click on sender name → popup with DM / Report options
  function handleNameClick(e) {
    e.stopPropagation();
    if (isOwnMessage || message.isOptimistic) return;
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

  const isAdmin = ["god_admin", "main_admin"].includes(userRole);
  const isMonitor = userRole === "chat_monitor";
  const canEdit = isOwnMessage && !message.isOptimistic && (Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000);

  const isTargetMonitor = message.anonymousNameSnapshot?.endsWith("(monitor)");
  const isTargetAdmin = message.anonymousNameSnapshot === "Admin" || message.anonymousNameSnapshot === "God_Admin";

  return (
    <div ref={ref} style={{ position: "relative" }} onContextMenu={handleContextMenu}>
      {message.isDeleted ? (
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
              <p style={{ margin: "0 0 6px 0", lineHeight: "1.4" }}>
                <strong
                  onClick={handleNameClick}
                  style={{
                    cursor: isOwnMessage ? "default" : "pointer",
                    textDecoration: isOwnMessage ? "none" : "underline",
                    textDecorationStyle: "dotted",
                  }}
                >
                  {message.anonymousNameSnapshot}:
                </strong>{" "}
                {message.text}
                {message.isEdited && <span style={{ fontSize: "0.8em", color: "#888", marginLeft: "6px" }}>(edited)</span>}
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

        </>
      )}

      {/* Right-click context menu (WhatsApp-style floating) */}
      {showContextMenu && (
        <div style={{
          position: "fixed", left: contextPos.x, top: contextPos.y,
          backgroundColor: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          border: "1px solid #e0e0e0", borderRadius: "8px", zIndex: 9999,
          minWidth: "160px", overflow: "hidden", animation: "fadeIn 0.1s ease"
        }}>
          {/* Own message actions */}
          {isOwnMessage && (
            <>
              {canEdit && (
                <button type="button" onClick={handleStartEdit} style={menuBtnStyle}>✏️ Edit</button>
              )}
              <button type="button" onClick={handleDelete} style={menuBtnStyle}>🗑️ Delete</button>
              <div style={{ ...menuBtnStyle, cursor: "default" }}>👁️ Seen by {message.seenBy?.length || 0}</div>
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
        </div>
      )}

      {/* Username click popup: DM / Report */}
      {showUserPopup && (
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