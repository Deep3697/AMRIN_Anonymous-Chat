// client/src/components/chat/MessageBubble.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import socket from "../../socket/socketClient";
import axiosClient from "../../api/axiosClient";
import { submitReport, createMonitorRequest } from "../../api/admin.api";
import { startConversation } from "../../api/conversation.api";
import { useChatStore } from "../../store/chatStore";
import PollView from "./PollView";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function MessageBubble({ message, isOwnMessage, userRole, threadType, blockedList = [], isSenderKicked, onUserAdded }) {
  const ref = useRef();
  const navigate = useNavigate();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextPos, setContextPos] = useState({ top: 0, left: 0, right: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [userPopupPos, setUserPopupPos] = useState({ x: 0, y: 0 });
  const [fullscreenMedia, setFullscreenMedia] = useState(null);

  const [modalConfig, setModalConfig] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [seenByViewers, setSeenByViewers] = useState(null);

  const setActiveGroupId = useChatStore((s) => s.setActiveGroupId);
  const isDM = threadType === "dm";
  const isUserBlocked = blockedList.includes(String(message.senderId));

  useEffect(() => {
    if (!isOwnMessage && message._id && !message.isOptimistic && !String(message._id).startsWith("temp_")) {
      socket.emit("message:seen", { messageId: message._id });
    }
  }, [message._id, isOwnMessage, message.isOptimistic]);

  useEffect(() => {
    function handleClickOutside() { setShowContextMenu(false); setShowUserPopup(false); }
    function handleCloseAllMenus() { setShowContextMenu(false); setShowUserPopup(false); }
    if (showContextMenu || showUserPopup) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("close-all-context-menus", handleCloseAllMenus);
      return () => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("close-all-context-menus", handleCloseAllMenus);
      };
    }
  }, [showContextMenu, showUserPopup]);

  function handleContextMenu(e) {
    e.preventDefault();
    if (message.isOptimistic || message.isDeleted) return;

    // Close all other context menus first
    document.dispatchEvent(new Event("close-all-context-menus"));

    // Position fixed to the viewport to avoid clipping by overflow:hidden containers
    const safeTop = Math.min(e.clientY, window.innerHeight - 220);
    if (isOwnMessage) {
      setContextPos({ top: safeTop, right: Math.max(10, window.innerWidth - e.clientX), left: null });
    } else {
      setContextPos({ top: safeTop, left: Math.min(e.clientX, window.innerWidth - 200), right: null });
    }

    // Small delay to let close event propagate before opening this menu
    setTimeout(() => setShowContextMenu(true), 0);
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
      type: "confirm", title: "Delete Message", message: "Are you sure you want to delete this message?",
      onConfirm: () => { socket.emit("message:delete", { messageId: message._id }); }
    });
    setShowContextMenu(false);
  }

  function handleReport(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalInput("");
    setModalConfig({
      type: "prompt", title: `Report ${message.anonymousNameSnapshot}`,
      message: `Report this message:\n"${message.text}"`,
      placeholder: "Enter a reason...",
      onConfirm: async (reason) => {
        if (!reason?.trim()) return;
        try {
          await submitReport(message.senderId, message.threadId, reason);
          setTimeout(() => { setModalConfig({ type: "alert", title: "Success", message: "Report submitted successfully." }); }, 100);
        } catch (err) {
          setTimeout(() => { setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to submit report" }); }, 100);
        }
      }
    });
    setShowContextMenu(false);
  }

  function handleMute(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm", title: "Mute User", message: `Mute ${message.anonymousNameSnapshot} for 24 hours?`,
      onConfirm: () => { socket.emit("user:mute", { userId: message.senderId, groupId: message.threadId, durationMinutes: 1440 }); }
    });
    setShowContextMenu(false);
  }

  function handleKick(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm", title: "Kick User", message: `Are you sure you want to kick ${message.anonymousNameSnapshot} from this group?`,
      onConfirm: () => { socket.emit("user:kick", { userId: message.senderId, groupId: message.threadId }); }
    });
    setShowContextMenu(false);
  }

  function handleRequestKick(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm", title: "Request Kick", message: `Request admin to kick ${message.anonymousNameSnapshot} from this group?`,
      onConfirm: async () => {
        try {
          await createMonitorRequest(message.threadId, "kick_member", message.senderId);
          setTimeout(() => { setModalConfig({ type: "alert", title: "Requested", message: "Kick request sent to admin for approval." }); }, 100);
        } catch (err) {
          setTimeout(() => { setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to submit request" }); }, 100);
        }
      }
    });
    setShowContextMenu(false);
  }

  function handleRequestAdd(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm", title: "Request Add", message: `Request admin to re-add ${message.anonymousNameSnapshot} to this group?`,
      onConfirm: async () => {
        try {
          await createMonitorRequest(message.threadId, "add_member", message.senderId);
          setTimeout(() => { setModalConfig({ type: "alert", title: "Requested", message: "Add request sent to admin for approval." }); }, 100);
        } catch (err) {
          setTimeout(() => { setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to submit request" }); }, 100);
        }
      }
    });
    setShowContextMenu(false);
  }

  function handleAddUser(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    socket.emit("user:add", { userId: message.senderId, groupId: message.threadId });
    if (onUserAdded) onUserAdded(message.senderId);
    setShowContextMenu(false);
  }

  function handleBlockUser(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm", title: "Block User", message: `Block ${message.anonymousNameSnapshot}? They won't be able to message you anymore.`,
      onConfirm: async () => {
        try {
          await axiosClient.post("/block", { blockedId: message.senderId });
          window.dispatchEvent(new Event("user-blocked"));
          setModalConfig({ type: "alert", title: "Blocked", message: `${message.anonymousNameSnapshot} has been blocked.` });
        } catch (err) {
          setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to block user" });
        }
      }
    });
    setShowContextMenu(false);
  }

  function handleUnblockUser(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm", title: "Unblock User", message: `Unblock ${message.anonymousNameSnapshot}? They will be able to message you again.`,
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/block/${message.senderId}`);
          window.dispatchEvent(new Event("user-blocked"));
          setModalConfig({ type: "alert", title: "Unblocked", message: `${message.anonymousNameSnapshot} has been unblocked.` });
        } catch (err) {
          setModalConfig({ type: "alert", title: "Error", message: err.response?.data?.error || "Failed to unblock user" });
        }
      }
    });
    setShowContextMenu(false);
  }

  function handleNameClick(e) {
    e.stopPropagation();
    if (isOwnMessage || message.isOptimistic || isDM) return;
    document.dispatchEvent(new Event("close-all-context-menus"));
    setTimeout(() => {
      setShowUserPopup(true);
      setUserPopupPos({
        x: Math.min(e.clientX, window.innerWidth - 200),
        y: Math.min(e.clientY, window.innerHeight - 180),
      });
    }, 0);
  }

  async function handleDMFromPopup(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      const res = await startConversation(message.senderId);
      const convo = res.data.conversation;
      
      // Dispatch event before setActiveGroupId so the Sidebar changes tab and doesn't auto-clear
      window.dispatchEvent(new Event("switch-to-dms"));
      
      setActiveGroupId(convo._id, "dm", convo.otherParticipantName || message.anonymousNameSnapshot);
      setShowUserPopup(false);
      
      // If we are currently on the admin dashboard, redirect to the chat page
      if (window.location.pathname.startsWith("/admin")) {
        navigate("/chat");
      }
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
      type: "confirm", title: "Promote to Monitor", message: `Promote ${message.anonymousNameSnapshot} to Chat Monitor?`,
      onConfirm: () => { socket.emit("user:promote", { userId: message.senderId, groupId: message.threadId }); }
    });
    setShowUserPopup(false);
  }

  function handleDemote(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setModalConfig({
      type: "confirm", title: "Demote to Member", message: `Demote ${message.anonymousNameSnapshot} back to Member?`,
      onConfirm: () => { socket.emit("user:demote", { userId: message.senderId, groupId: message.threadId }); }
    });
    setShowUserPopup(false);
  }

  async function handleShowSeenBy(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setShowContextMenu(false);
    try {
      const res = await axiosClient.get(`/messages/${message._id}/seen-by`);
      setSeenByViewers(res.data.viewers || []);
    } catch { setSeenByViewers([]); }
  }

  const isGodAdmin = userRole === "god_admin";
  const isAdmin = ["god_admin", "main_admin"].includes(userRole);
  const isMonitor = userRole === "chat_monitor";
  const canEdit = isOwnMessage && !message.isOptimistic && (Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000);
  const isTargetMonitor = message.anonymousNameSnapshot?.endsWith("(monitor)");
  const isTargetAdmin = message.anonymousNameSnapshot === "Admin" || message.anonymousNameSnapshot === "God_Admin";

  function renderSeenLabel() {
    if (!isOwnMessage) return null;
    if (isDM) {
      const seenCount = message.seenBy?.length || 0;
      return seenCount > 0
        ? <span className="msg-seen-tag">✓✓ Seen</span>
        : <span className="msg-unseen-tag">✓ Sent</span>;
    }
    return null;
  }

  return (
    <div ref={ref} style={{ position: "relative" }} onContextMenu={handleContextMenu}>

      {/* ─── System message ─── */}
      {message.type === "system" ? (
        <div className="msg-system">
          <span className="msg-system-text">{message.text}</span>
        </div>

      /* ─── Deleted ─── */
      ) : message.isDeleted ? (
        <em className="msg-deleted">
          This message was deleted{message.deletedBySnapshot ? ` by ${message.deletedBySnapshot}` : ""}
        </em>

      /* ─── Poll ─── */
      ) : message.type === "poll" ? (
        <>
          <div className="msg-text-content" style={{ marginBottom: "4px" }}>
            <span
              className="msg-sender-name"
              onClick={handleNameClick}
              style={{ cursor: (isOwnMessage || isDM) ? "default" : "pointer" }}
            >
              {message.anonymousNameSnapshot}:
            </span>
          </div>
          <PollView message={message} />
        </>

      /* ─── Normal message ─── */
      ) : (
        <>
          {isEditing ? (
            <div>
              <input
                type="text" value={editText} autoFocus
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(e); if (e.key === "Escape") handleCancelEdit(e); }}
                className="msg-edit-input"
              />
              <div style={{ marginTop: 4, display: "flex", gap: 5 }}>
                <button type="button" onClick={handleSaveEdit} className="msg-edit-btn">Save</button>
                <button type="button" onClick={handleCancelEdit} className="msg-edit-btn msg-edit-btn--cancel">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="msg-text-content">
              <span
                className="msg-sender-name"
                onClick={handleNameClick}
                style={{ cursor: (isOwnMessage || isDM) ? "default" : "pointer" }}
              >
                {message.anonymousNameSnapshot}:
              </span>{" "}
              {message.text}
            </div>
          )}

          {/* Attachments */}
          {message.attachment && (
            <div className="msg-attachment">
              {message.attachment.type === "image" && (
                <img 
                  src={message.attachment.url} 
                  alt="Attachment" 
                  style={{ cursor: "zoom-in" }}
                  onClick={(e) => { e.stopPropagation(); setFullscreenMedia({ url: message.attachment.url, type: 'image' }); }}
                />
              )}
              {message.attachment.type === "video" && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <video src={message.attachment.url} controls />
                  <button 
                    type="button"
                    title="Fullscreen"
                    onClick={(e) => { e.stopPropagation(); setFullscreenMedia({ url: message.attachment.url, type: 'video' }); }}
                    style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12, zIndex: 10 }}
                  >
                    ⛶
                  </button>
                </div>
              )}
              {message.attachment.type === "audio" && (
                <audio src={message.attachment.url} controls style={{ display: "block", marginTop: 4 }} />
              )}
              {message.attachment.type === "file" && (
                <a href={message.attachment.url} target="_blank" rel="noreferrer" className="msg-attachment-file">
                  📄 {message.attachment.fileName || "Download file"}
                </a>
              )}
              {message.attachment.caption && (
                <p style={{ fontSize: "10px", color: "var(--text-3)", marginTop: 4 }}>{message.attachment.caption}</p>
              )}
            </div>
          )}

          {/* Meta row: time + seen */}
          <div className="msg-meta">
            {message.isEdited && <span className="msg-edited-tag">edited</span>}
            <span>{formatTime(message.createdAt)}</span>
            {renderSeenLabel()}
          </div>
        </>
      )}

      {/* ─── RIGHT-CLICK CONTEXT MENU (positioned near the message) ─── */}
      {showContextMenu && createPortal(
        <div
          className="ctx-menu"
          style={{
            position: "fixed",
            top: contextPos.top,
            left: contextPos.left != null ? contextPos.left : undefined,
            right: contextPos.right != null ? contextPos.right : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => { e.preventDefault(); setShowContextMenu(false); }}
        >
          {isDM ? (
            /* ── DM Context Menu ── */
            isOwnMessage ? (
              <>
                {canEdit && <button type="button" onClick={handleStartEdit} className="ctx-menu-item">Edit</button>}
                <button type="button" onClick={handleDelete} className="ctx-menu-item">Delete</button>
                <div className="ctx-menu-item ctx-menu-item--info">
                  {(message.seenBy?.length || 0) > 0
                    ? <span className="msg-seen-tag">✓✓ Seen</span>
                    : <span className="msg-unseen-tag">✓ Not Seen</span>
                  }
                </div>
              </>
            ) : (
              isUserBlocked ? (
                <button type="button" onClick={handleUnblockUser} className="ctx-menu-item">Unblock User</button>
              ) : (
                <button type="button" onClick={handleBlockUser} className="ctx-menu-item ctx-menu-item--danger">Block User</button>
              )
            )
          ) : (
            /* ── Group Context Menu ── */
            <>
              {isOwnMessage && (
                <>
                  {canEdit && <button type="button" onClick={handleStartEdit} className="ctx-menu-item">Edit</button>}
                  <button type="button" onClick={handleDelete} className="ctx-menu-item">Delete</button>
                  <button type="button" onClick={handleShowSeenBy} className="ctx-menu-item">Seen by {message.seenBy?.length || 0}</button>
                </>
              )}
              {!isOwnMessage && (
                <>
                  {!isAdmin && <button type="button" onClick={handleReport} className="ctx-menu-item">Report</button>}
                  {(isAdmin || isMonitor) && (
                    <>
                      <button type="button" onClick={handleDelete} className="ctx-menu-item">Delete Msg</button>
                      <button type="button" onClick={handleMute} className="ctx-menu-item">Mute 24h</button>
                    </>
                  )}
                  {isAdmin && (
                    isSenderKicked ? (
                      <button type="button" onClick={handleAddUser} className="ctx-menu-item">Add User</button>
                    ) : (
                      <button type="button" onClick={handleKick} className="ctx-menu-item ctx-menu-item--danger">Kick User</button>
                    )
                  )}
                  {isMonitor && !isAdmin && (
                    isSenderKicked ? (
                      <button type="button" onClick={handleRequestAdd} className="ctx-menu-item">Request Add</button>
                    ) : (
                      <button type="button" onClick={handleRequestKick} className="ctx-menu-item ctx-menu-item--danger">Request Kick</button>
                    )
                  )}
                </>
              )}
            </>
          )}
        </div>,
        document.body
      )}

      {/* ─── Name Click Popup ─── */}
      {showUserPopup && !isDM && createPortal(
        <div className="user-popup" style={{ position: "fixed", left: userPopupPos.x, top: userPopupPos.y }} onClick={(e) => e.stopPropagation()}>
          <div className="user-popup-header">{message.anonymousNameSnapshot}</div>
          <button type="button" onClick={handleDMFromPopup} className="ctx-menu-item">Send DM</button>
          {!isAdmin && <button type="button" onClick={handleReportFromPopup} className="ctx-menu-item">Report User</button>}
          {isGodAdmin && !isTargetAdmin && (
            isTargetMonitor
              ? <button type="button" onClick={handleDemote} className="ctx-menu-item">Demote to Member</button>
              : <button type="button" onClick={handlePromote} className="ctx-menu-item">Promote to Monitor</button>
          )}
        </div>,
        document.body
      )}

      {/* ─── Modal (Alert / Confirm / Prompt) ─── */}
      {modalConfig && createPortal(
        <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); setModalConfig(null); }}>
          <div className="modal-backdrop" />
          <div className="modal-card" style={{ width: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-inner">
              <div className="modal-title">{modalConfig.title}</div>
              {modalConfig.message && (
                <p className="modal-subtitle" style={{ whiteSpace: "pre-wrap" }}>{modalConfig.message}</p>
              )}
              {modalConfig.type === "prompt" && (
                <input
                  autoFocus type="text" className="modal-input"
                  placeholder={modalConfig.placeholder} value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); modalConfig.onConfirm(modalInput); setModalConfig(null); }
                  }}
                />
              )}
              <div className="modal-btn-row">
                {(modalConfig.type === "confirm" || modalConfig.type === "prompt") && (
                  <button type="button" className="modal-btn" onClick={(e) => { e.stopPropagation(); setModalConfig(null); }}>Cancel</button>
                )}
                <button type="button" className="modal-btn modal-btn--primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (modalConfig.type === "prompt") modalConfig.onConfirm(modalInput || "");
                    else if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig(null);
                  }}
                >
                  {modalConfig.type === "alert" ? "OK" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Seen By Modal ─── */}
      {seenByViewers !== null && createPortal(
        <div className="modal-overlay" onClick={() => setSeenByViewers(null)}>
          <div className="modal-backdrop" />
          <div className="modal-card" style={{ width: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-inner">
              <div className="modal-header-row">
                <div className="modal-title">👁️ Seen by {seenByViewers.length}</div>
                <button className="modal-close-btn" onClick={() => setSeenByViewers(null)}>✕</button>
              </div>
              <div className="modal-thread">
                {seenByViewers.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: "10.5px" }}>No one has seen this message yet</div>
                ) : (
                  seenByViewers.map((v) => (
                    <div key={v._id} style={{ padding: "8px 0", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid var(--border)" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center",
                        background: "var(--primary-soft)", fontSize: "9px", fontWeight: 800, color: "var(--primary)"
                      }}>
                        {(v.anonymousName || "?")[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 600 }}>{v.anonymousName || "Unknown"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Fullscreen Media Modal ─── */}
      {fullscreenMedia && createPortal(
        <div 
          className="modal-overlay" 
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", cursor: "zoom-out" }} 
          onClick={(e) => { e.stopPropagation(); setFullscreenMedia(null); }}
        >
          {fullscreenMedia.type === 'image' ? (
            <img 
              src={fullscreenMedia.url} 
              alt="Fullscreen Attachment" 
              style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} 
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video 
              src={fullscreenMedia.url} 
              controls
              autoPlay
              style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} 
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button 
            type="button"
            className="modal-close-btn" 
            style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(0,0,0,0.5)", color: "white", width: "40px", height: "40px", borderRadius: "50%", fontSize: "20px", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}
            onClick={(e) => { e.stopPropagation(); setFullscreenMedia(null); }}
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}