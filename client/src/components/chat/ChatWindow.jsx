import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import socket from "../../socket/socketClient";
import axiosClient from "../../api/axiosClient";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import OpportunityCard from "./OpportunityCard";
import { uploadMedia } from "../../utils/uploadMedia";
import PollCreator from "./PollCreator";

export default function ChatWindow() {
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const activeThreadType = useChatStore((s) => s.activeThreadType) || "group";
  const activeThreadName = useChatStore((s) => s.activeThreadName);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeGroupId],
    queryFn: () => axiosClient.get(`/messages/${activeGroupId}`).then((r) => r.data.messages || []),
    enabled: !!activeGroupId,
  });

  function setMessages(updater) {
    queryClient.setQueryData(["messages", activeGroupId], (old = []) =>
      typeof updater === "function" ? updater(old) : updater
    );
  }

  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);

  useEffect(() => {
    if (!activeGroupId) return;

    axiosClient.get(`/messages/${activeGroupId}`).then((res) => setMessages(res.data.messages || []));

    // Mark as read if it is a group or DM
    if (activeThreadType === "group") {
      axiosClient.patch(`/groups/${activeGroupId}/read`).catch(() => { });
    } else if (activeThreadType === "dm") {
      axiosClient.patch(`/conversations/${activeGroupId}/read`).catch(() => { });
    }

    socket.emit("group:join", activeGroupId);

    const handleNew = (m) => {
      setMessages((prev) => {
        if (m.tempId && prev.some((x) => x._id === m.tempId)) {
          return prev.map((x) => (x._id === m.tempId ? m : x));
        }
        return [...prev, m];
      });
      if (String(m.threadId) === String(activeGroupId)) {
        if (activeThreadType === "group") {
          axiosClient.patch(`/groups/${activeGroupId}/read`).catch(() => { });
        } else if (activeThreadType === "dm") {
          axiosClient.patch(`/conversations/${activeGroupId}/read`).catch(() => { });
        }
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
    return (
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "#888" }}>
        <h2>Select a group or conversation from the sidebar to start chatting</h2>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>

      {/* Header showing Group/Person name */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border, #2e303a)", backgroundColor: "rgba(255,255,255,0.02)" }}>
        <h3 style={{ margin: 0, color: "var(--text-h, #f3f4f6)", fontSize: "1.1em" }}>
          {activeThreadType === "dm" ? "🔒 " : "👥 "}{activeThreadName || (activeThreadType === "dm" ? "Direct Message" : "Group Chat")}
        </h3>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
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
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "16px 0 12px", gap: "12px"
                }}>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border, #2e303a)" }} />
                  <span style={{
                    fontSize: "0.75em", color: "var(--text, #9ca3af)", backgroundColor: "var(--code-bg, #1f2028)",
                    border: "1px solid var(--border, #2e303a)",
                    padding: "4px 14px", borderRadius: "12px", fontWeight: "600",
                    letterSpacing: "0.3px", whiteSpace: "nowrap"
                  }}>
                    {dateLabel}
                  </span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border, #2e303a)" }} />
                </div>
              )}
              <div style={{ marginBottom: "12px", position: "relative" }}>
                <OpportunityCard message={m} isOwnMessage={isOwn} userRole={user?.role || "member"} threadType={activeThreadType} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Staged Attachment Preview */}
      {pendingAttachment && (
        <div style={{ padding: "8px 20px", backgroundColor: "var(--code-bg, #1f2028)", borderTop: "1px solid var(--border, #2e303a)", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>📎</span>
          <span style={{ flex: 1, color: "var(--text-h, #f3f4f6)", fontSize: "0.9em", fontWeight: "bold" }}>
            {pendingAttachment.name}
          </span>
          <button
            onClick={() => setPendingAttachment(null)}
            style={{ background: "transparent", border: "none", color: "#dc3545", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}
            title="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={sendMessage} style={{ display: "flex", padding: "16px 20px", borderTop: "1px solid var(--border, #2e303a)", gap: "10px", alignItems: "center" }}>
        <input
          style={{ flex: 1, padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          disabled={isUploading}
        />
        <input
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileUpload}
          style={{ cursor: "pointer" }}
          disabled={isUploading}
        />
        <button type="button" onClick={() => setShowPollCreator(true)} style={{ padding: "10px", cursor: "pointer" }}>📊</button>
        <button type="submit" disabled={isUploading || (!text.trim() && !pendingAttachment)} style={{ padding: "10px 20px", cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", opacity: (isUploading || (!text.trim() && !pendingAttachment)) ? 0.6 : 1 }}>
          {isUploading ? "Sending..." : "Send"}
        </button>
      </form>
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