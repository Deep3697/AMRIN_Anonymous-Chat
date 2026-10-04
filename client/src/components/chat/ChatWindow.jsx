import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Send, BarChart3, Users, Lock, ShieldOff } from "lucide-react";
import socket from "../../socket/socketClient";
import axiosClient from "../../api/axiosClient";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import OpportunityCard from "./OpportunityCard";
import { uploadMedia } from "../../utils/uploadMedia";
import PollCreator from "./PollCreator";

export default function ChatWindow({ onMobileBack }) {
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const activeThreadType = useChatStore((s) => s.activeThreadType) || "group";
  const activeThreadName = useChatStore((s) => s.activeThreadName);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: chatData = { messages: [], kickedUsers: [] } } = useQuery({
    queryKey: ["messages", activeGroupId],
    queryFn: () => axiosClient.get(`/messages/${activeGroupId}`).then((r) => r.data),
    enabled: !!activeGroupId,
  });

  const messages = chatData.messages || [];
  const kickedUsers = chatData.kickedUsers || [];

  function setMessages(updater) {
    queryClient.setQueryData(["messages", activeGroupId], (old = { messages: [], kickedUsers: [] }) => {
      const newMessages = typeof updater === "function" ? updater(old.messages || []) : updater;
      return { ...old, messages: newMessages };
    });
  }

  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [blockedList, setBlockedList] = useState([]);
  const [isKickedFromGroup, setIsKickedFromGroup] = useState(false);

  // Check if the user has been kicked from this group
  useEffect(() => {
    if (activeThreadType === "group" && activeGroupId) {
      const kickedGroups = JSON.parse(localStorage.getItem("amrin_kicked_groups") || "[]");
      setIsKickedFromGroup(kickedGroups.includes(String(activeGroupId)));
    } else {
      setIsKickedFromGroup(false);
    }

    // Listen for real-time kick while viewing this group
    const handleKicked = ({ userId, groupId }) => {
      const myId = String(user?.id || user?._id || user?.sub);
      if (String(userId) === myId && String(groupId) === String(activeGroupId)) {
        setIsKickedFromGroup(true);
      }
    };

    // Listen for real-time re-added while viewing this group
    const handleReadded = ({ userId, groupId }) => {
      const myId = String(user?.id || user?._id || user?.sub);
      if (String(userId) === myId && String(groupId) === String(activeGroupId)) {
        setIsKickedFromGroup(false);
      }
    };

    socket.on("user:kicked", handleKicked);
    socket.on("user:readded", handleReadded);
    return () => {
      socket.off("user:kicked", handleKicked);
      socket.off("user:readded", handleReadded);
    };
  }, [activeGroupId, activeThreadType, user]);

  useEffect(() => {
    const fetchBlocks = () => {
      if (activeThreadType === "dm") {
        axiosClient.get("/block/list").then((res) => {
          setBlockedList(res.data.blocks.map(b => String(b.blockedId._id || b.blockedId)));
        }).catch(console.error);
      } else {
        setBlockedList([]);
      }
    };
    fetchBlocks();
    window.addEventListener("user-blocked", fetchBlocks);
    return () => window.removeEventListener("user-blocked", fetchBlocks);
  }, [activeGroupId, activeThreadType]);

  // Auto-scroll to bottom
  // useEffect(() => {
  //   if (messagesEndRef.current) {
  //     messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [messages]);
  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!activeGroupId) return;

    // Mark as read if it is a group or DM
    if (activeThreadType === "group") {
      axiosClient.patch(`/groups/${activeGroupId}/read`).catch((err) => console.error("Mark read failed:", err));
    } else if (activeThreadType === "dm") {
      axiosClient.patch(`/conversations/${activeGroupId}/read`).catch((err) => console.error("Mark read failed:", err));
    }

    if (activeThreadType === "group") {
      socket.emit("group:join", activeGroupId);
    }
    const handleNew = (m) => {
      if (String(m.threadId) !== String(activeGroupId)) return;

      setMessages((prev) => {
        if (m.tempId && prev.some((x) => x._id === m.tempId)) {
          return prev.map((x) => (x._id === m.tempId ? m : x));
        }
        return [...prev, m];
      });
      if (activeThreadType === "group") {
        axiosClient.patch(`/groups/${activeGroupId}/read`).catch((err) => console.error("Mark read failed:", err));
      } else if (activeThreadType === "dm") {
        axiosClient.patch(`/conversations/${activeGroupId}/read`).catch((err) => console.error("Mark read failed:", err));
      }
    };

    const handleUpdate = (updated) => {
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    };

    const handleSeenUpdate = ({ messageId, seenCount }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === messageId) {
            return { ...m, seenBy: Array.from({ length: seenCount }) };
          }
          return m;
        })
      );
    };

    const handleError = (err) => {
      alert("Error: " + err.error);
      if (err.tempId) {
        setMessages((prev) => prev.filter((m) => m._id !== err.tempId));
      }
    };

    socket.on("message:new", handleNew);
    socket.on("message:updated", handleUpdate);
    socket.on("message:seenUpdate", handleSeenUpdate);
    socket.on("message:error", handleError);

    return () => {
      socket.off("message:new", handleNew);
      socket.off("message:updated", handleUpdate);
      socket.off("message:seenUpdate", handleSeenUpdate);
      socket.off("message:error", handleError);
    };
  }, [activeGroupId, activeThreadType]);

  const handleUserAdded = (userId) => {
    queryClient.setQueryData(["messages", activeGroupId], (old = { messages: [], kickedUsers: [] }) => {
      return { ...old, kickedUsers: (old.kickedUsers || []).filter(id => String(id) !== String(userId)) };
    });
  };

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() && !pendingAttachment) return;
    if (!activeGroupId) return;

    const currentText = text.trim();
    const fileToUpload = pendingAttachment;

    // Clear input & pending immediately
    setText("");
    setPendingAttachment(null);
    setIsUploading(true);

    const tempId = "temp_" + Date.now();
    const optimisticMessage = {
      _id: tempId,
      text: currentText,
      anonymousNameSnapshot: user?.anonymousName || "Me",
      senderId: user?.id || user?._id || user?.sub,
      type: "user",
      isOptimistic: true,
      createdAt: new Date().toISOString(),
    };

    if (fileToUpload) {
      const type = fileToUpload.type.startsWith("image") ? "image"
        : fileToUpload.type.startsWith("video") ? "video"
          : fileToUpload.type.startsWith("audio") ? "audio"
            : "file";
      optimisticMessage.attachment = { type, url: URL.createObjectURL(fileToUpload), caption: "" };
    }

    setMessages((prev) => [...prev, optimisticMessage]);

    if (fileToUpload) {
      try {
        const { url, publicId } = await uploadMedia(fileToUpload);
        socket.emit("message:send", {
          threadId: activeGroupId,
          threadType: activeThreadType,
          text: currentText,
          attachment: { type: optimisticMessage.attachment.type, url, publicId, caption: "", fileName: fileToUpload.name },
          tempId
        });
      } catch (err) {
        alert("Failed to upload file");
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        setText(currentText);
        setPendingAttachment(fileToUpload);
      } finally {
        setIsUploading(false);
      }
    } else {
      socket.emit("message:send", {
        threadId: activeGroupId,
        threadType: activeThreadType,
        text: currentText,
        tempId
      });
      setIsUploading(false);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      setPendingAttachment(file);
    }
    e.target.value = ""; // clear input so same file can be picked again
  }

  if (!activeGroupId) {
    return null; // Empty state is handled by ChatPage
  }

  const avatarInitial = (activeThreadName || "C")[0].toUpperCase();
  const isGroup = activeThreadType === "group";

  return (
    <div className="active-chat-panel">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-hdr-back-btn" onClick={onMobileBack}>
          <ArrowLeft size={17} />
        </button>
        <div className={`chat-hdr-av ${isGroup ? "chat-hdr-av--group" : "chat-hdr-av--dm"}`}>
          {avatarInitial}
        </div>
        <div className="chat-hdr-info">
          <div className="chat-hdr-name">
            {activeThreadName || (isGroup ? "Group Chat" : "Direct Message")}
          </div>
          <div className="chat-hdr-status">
            {isGroup ? (
              <><Users size={10} style={{ marginRight: 4 }} /> Group Chat</>
            ) : (
              <><Lock size={10} style={{ marginRight: 4 }} /> Private · Encrypted</>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-box" ref={messagesContainerRef}>
        <div className="messages-inner">
          {messages.map((m, idx) => {
            const isOwn = String(m.senderId) === String(user?.id || user?._id || user?.sub) || m.anonymousNameSnapshot === user?.anonymousName;

            // Date separator logic
            let showDateSeparator = false;
            let dateLabel = "";
            const msgDate = new Date(m.createdAt);
            if (idx === 0) {
              showDateSeparator = true;
            } else {
              const prevDate = new Date(messages[idx - 1].createdAt);
              if (msgDate.toDateString() !== prevDate.toDateString()) {
                showDateSeparator = true;
              }
            }
            if (showDateSeparator) {
              const today = new Date();
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              if (msgDate.toDateString() === today.toDateString()) {
                dateLabel = "Today";
              } else if (msgDate.toDateString() === yesterday.toDateString()) {
                dateLabel = "Yesterday";
              } else {
                dateLabel = msgDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
              }
            }

            return (
              <div key={m._id}>
                {showDateSeparator && (
                  <div className="msg-date-sep">
                    <span>{dateLabel}</span>
                  </div>
                )}
                {m.type === "system" ? (
                  <div
                    className="msg-cluster msg-cluster--system"
                    style={{ animationDelay: `${Math.min(idx, 10) * 48}ms`, alignItems: "center" }}
                  >
                    <div className="msg-system">
                      <span className="msg-system-text">{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`msg-cluster ${isOwn ? "msg-cluster--out" : "msg-cluster--in"}`}
                    style={{ animationDelay: `${Math.min(idx, 10) * 48}ms` }}
                  >
                    <div className="msg-row">
                      <div className={`msg-bubble ${m.isOptimistic ? "msg-bubble--optimistic" : ""} ${m.attachment ? "msg-bubble--has-attachment" : ""}`}>
                        {m.isOptimistic && (
                          <span className="msg-sending-tag">Sending…</span>
                        )}
                        <OpportunityCard 
                          message={m} 
                          isOwnMessage={isOwn} 
                          userRole={user?.role || "member"} 
                          threadType={activeThreadType} 
                          blockedList={blockedList} 
                          isSenderKicked={kickedUsers.includes(String(m.senderId))}
                          onUserAdded={handleUserAdded}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Attachment Preview */}
      {pendingAttachment && (
        <div className="composer-attachment-preview">
          <Paperclip size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <span className="composer-attachment-name">{pendingAttachment.name}</span>
          <button
            className="composer-attachment-remove"
            onClick={() => setPendingAttachment(null)}
            title="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      {/* Composer */}
      {(() => {
        const myId = user?.id || user?._id || user?.sub;
        const otherUserMsg = messages.find(m => String(m.senderId) !== String(myId));
        const otherUserId = otherUserMsg ? String(otherUserMsg.senderId) : null;
        const isBlocked = otherUserId && blockedList.includes(otherUserId);

        async function handleUnblock() {
          if (!otherUserId) return;
          try {
            await axiosClient.delete(`/block/${otherUserId}`);
            setBlockedList(prev => prev.filter(id => id !== otherUserId));
            window.dispatchEvent(new Event("user-blocked"));
          } catch (err) {
            alert("Failed to unblock user");
          }
        }

        if (activeThreadType === "dm" && isBlocked) {
          return (
            <div className="chat-blocked-banner" style={{ padding: "20px", textAlign: "center", background: "var(--surface-hover)", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Lock size={20} style={{ marginBottom: "8px", color: "var(--text-muted)" }} />
              <div style={{ color: "var(--text)", fontWeight: "500", marginBottom: "12px" }}>You have blocked this user.</div>
              <button onClick={handleUnblock} style={{ padding: "8px 20px", borderRadius: "8px", background: "var(--text)", color: "var(--bg)", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                Unblock
              </button>
            </div>
          );
        }

        // Kicked from group — show removed banner
        if (isKickedFromGroup) {
          return (
            <div className="chat-kicked-banner">
              <ShieldOff size={20} />
              <div className="chat-kicked-banner-text">You have been removed from this group. You can no longer send messages here.</div>
            </div>
          );
        }

        return (
          <form className="chat-composer" onSubmit={sendMessage}>
            <button
              type="button"
              className="composer-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden-file-input"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
              onChange={handleFileUpload}
              disabled={isUploading}
            />

            <input
              className="composer-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              disabled={isUploading}
            />

            <button
              type="button"
              className="composer-poll-btn"
              onClick={() => setShowPollCreator(true)}
              title="Create Poll"
            >
              <BarChart3 size={16} />
            </button>

            <button
              type="submit"
              className="composer-send-btn"
              disabled={isUploading || (!text.trim() && !pendingAttachment)}
            >
              <span className="composer-send-label">
                {isUploading ? "SENDING" : "SEND"}
              </span>
              <Send size={14} />
            </button>
          </form>
        );
      })()}

      {showPollCreator && (
        <PollCreator
          threadId={activeGroupId}
          threadType={activeThreadType}
          onClose={() => setShowPollCreator(false)}
        />
      )}
    </div>
  );
}