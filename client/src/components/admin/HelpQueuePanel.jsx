import { useState, useEffect } from "react";
import { fetchAllHelpThreads, replyToHelpThread, resolveHelpThread } from "../../api/help.api";

export default function HelpQueuePanel() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    loadThreads();
  }, []);

  async function loadThreads() {
    setLoading(true);
    try {
      const res = await fetchAllHelpThreads();
      setThreads(res.data.threads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(threadId) {
    const text = replyText[threadId];
    if (!text?.trim()) return;
    try {
      await replyToHelpThread(threadId, text);
      setReplyText((prev) => ({ ...prev, [threadId]: "" }));
      loadThreads();
    } catch (err) {
      console.error(err);
      alert("Failed to send reply");
    }
  }

  async function handleResolve(threadId) {
    if (!confirm("Are you sure you want to mark this request as resolved?")) return;
    try {
      await resolveHelpThread(threadId);
      loadThreads(); // Will remove it from the list since we only fetch 'open'
    } catch (err) {
      console.error(err);
      alert("Failed to resolve");
    }
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Help Requests</h2>
        <button onClick={loadThreads} style={{ padding: "6px 12px", cursor: "pointer" }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {threads.length === 0 ? (
        <p>No open help requests found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {threads.map((thread) => (
            <div key={thread._id} style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>User: {thread.studentId?.anonymousName || "Unknown"}</strong> ({thread.studentId?.email || "No email"})
                </div>
                <button onClick={() => handleResolve(thread._id)} style={{ padding: "4px 8px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                  ✓ Resolve
                </button>
              </div>
              <div style={{ marginTop: "10px", backgroundColor: "#f9f9f9", padding: "10px", borderRadius: "4px", maxHeight: "200px", overflowY: "auto" }}>
                {thread.messages.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: "8px", textAlign: m.isAdmin ? "right" : "left" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      backgroundColor: m.isAdmin ? "#d1ecf1" : "#e2e3e5",
                      fontSize: "0.9em"
                    }}>
                      {m.text}
                    </span>
                    <div style={{ fontSize: "0.75em", color: "#888", marginTop: "2px" }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <input 
                  style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} 
                  placeholder="Type a reply..."
                  value={replyText[thread._id] || ""}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [thread._id]: e.target.value }))}
                />
                <button onClick={() => handleReply(thread._id)} style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
