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
    <div>
      <div className="admin-panel-header">
        <h3 className="admin-panel-title">Help Requests</h3>
        <button onClick={loadThreads} className="admin-refresh-btn">
          {loading ? "Refreshing..." : "Refresh ↻"}
        </button>
      </div>

      {threads.length === 0 ? (
        <p className="admin-empty">No open help requests found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {threads.map((thread, idx) => (
            <div
              key={thread._id}
              className="admin-report-card admin-report-card--info"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
                  <strong style={{ color: "var(--admin-text)", fontSize: "13px" }}>
                    {thread.studentId?.anonymousName || "Unknown"}
                  </strong>
                  <span style={{ marginLeft: "8px", fontSize: "10px", color: "var(--admin-text-3)" }}>
                    ({thread.studentId?.email || "No email"})
                  </span>
                </div>
                <button
                  onClick={() => handleResolve(thread._id)}
                  className="admin-btn admin-btn--success admin-btn--sm"
                >
                  ✓ Resolve
                </button>
              </div>

              {/* Message thread */}
              <div className="admin-help-thread-msgs">
                {thread.messages.map((m, midx) => (
                  <div key={midx} className={`admin-help-msg ${m.isAdmin ? "admin-help-msg--admin" : "admin-help-msg--user"}`}>
                    <span className={`admin-help-msg-bubble ${m.isAdmin ? "admin-help-msg-bubble--admin" : "admin-help-msg-bubble--user"}`}>
                      {m.text}
                    </span>
                    <div className="admin-help-msg-time">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply form */}
              <div className="admin-reply-row">
                <input
                  type="text"
                  placeholder="Type a reply..."
                  value={replyText[thread._id] || ""}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [thread._id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleReply(thread._id);
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => handleReply(thread._id)}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
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
