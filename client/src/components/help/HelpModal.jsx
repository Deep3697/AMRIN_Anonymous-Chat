import { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

export default function HelpModal({ onClose }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState(null);

  useEffect(() => { loadThread(); }, []);

  async function loadThread() {
    try {
      const res = await axiosClient.get("/help/my-thread");
      setThread(res.data.thread);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSend() {
    if (!text.trim()) return;
    try {
      await axiosClient.post("/help/send", { text });
      setMessage("✅ Sent to admin.");
      setText("");
      loadThread();
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.error || "Failed to send"));
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-card" style={{ width: "min(440px, calc(100vw - 24px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner">
          <div className="modal-header-row">
            <div className="modal-title">📩 Contact Admin</div>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>

          {/* Existing thread / conversation */}
          {thread && thread.messages.length > 0 && (
            <div className="modal-thread">
              {thread.status === "closed" && (
                <div className="modal-resolved">✅ This query has been resolved by Admin</div>
              )}
              {thread.messages.map((m, idx) => (
                <div
                  key={idx}
                  className="modal-thread-msg"
                  style={{ textAlign: m.isAdmin ? "left" : "right" }}
                >
                  {m.isAdmin && (
                    <span className="modal-thread-label">Admin</span>
                  )}
                  <span className={`modal-thread-bubble ${m.isAdmin ? "modal-thread-bubble--admin" : "modal-thread-bubble--user"}`}>
                    {m.text}
                  </span>
                  <div className="modal-thread-time">
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="modal-subtitle">
            Need help? Send a message to the admin. (Max 3 messages per day)
          </p>

          <textarea
            className="modal-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your issue..."
            rows={3}
          />

          <div className="modal-btn-row">
            <button type="button" className="modal-btn" onClick={onClose}>Close</button>
            <button type="button" className="modal-btn modal-btn--primary" onClick={handleSend}>Send</button>
          </div>

          {message && (
            <p className={`modal-status-msg ${message.startsWith("✅") ? "modal-status-msg--success" : "modal-status-msg--error"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}