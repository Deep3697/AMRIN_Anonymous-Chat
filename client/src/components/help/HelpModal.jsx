import { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

export default function HelpModal({ onClose }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState(null);

  useEffect(() => {
    loadThread();
  }, []);

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
      setMessage(err.response?.data?.error || "Failed to send");
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1em" }}>📩 Contact Admin</h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {thread && thread.messages.length > 0 && (
          <div style={{ marginBottom: "16px", backgroundColor: "#f9f9f9", padding: "10px", borderRadius: "4px", maxHeight: "250px", overflowY: "auto" }}>
            {thread.status === "closed" && <div style={{ textAlign: "center", color: "#28a745", marginBottom: "10px", fontWeight: "bold" }}>This query has been resolved by Admin</div>}
            {thread.messages.map((m, idx) => (
              <div key={idx} style={{ marginBottom: "8px", textAlign: m.isAdmin ? "left" : "right" }}>
                <span style={{
                  display: "inline-block",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  backgroundColor: m.isAdmin ? "#e2e3e5" : "#007bff",
                  color: m.isAdmin ? "black" : "white",
                  fontSize: "0.9em",
                  maxWidth: "80%",
                  wordWrap: "break-word"
                }}>
                  {m.isAdmin && <strong style={{ display: "block", fontSize: "0.8em", marginBottom: "2px", color: "#555" }}>Admin</strong>}
                  {m.text}
                </span>
                <div style={{ fontSize: "0.7em", color: "#888", marginTop: "2px" }}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: "0.85em", color: "#666", margin: "0 0 12px" }}>
          Need help? Send a message to the admin. (Max 3 messages per day)
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your issue..."
          rows={3}
          style={{
            width: "100%", padding: "10px", borderRadius: "6px",
            border: "1px solid #ddd", fontSize: "0.9em", resize: "vertical",
            outline: "none", boxSizing: "border-box"
          }}
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button onClick={handleSend} style={sendBtnStyle}>Send</button>
          <button onClick={onClose} style={cancelBtnStyle}>Close</button>
        </div>
        {message && (
          <p style={{ marginTop: "10px", fontSize: "0.85em", color: message.startsWith("✅") ? "#28a745" : "#dc3545" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0,0,0,0.4)", display: "flex",
  justifyContent: "center", alignItems: "center", zIndex: 10000,
};

const modalStyle = {
  backgroundColor: "white", borderRadius: "10px", padding: "24px",
  width: "420px", maxWidth: "90vw", boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
};

const closeBtnStyle = {
  background: "none", border: "none", fontSize: "1.2em",
  cursor: "pointer", color: "#888", padding: "4px",
};

const sendBtnStyle = {
  padding: "8px 20px", backgroundColor: "#007bff", color: "white",
  border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
};

const cancelBtnStyle = {
  padding: "8px 20px", backgroundColor: "#f0f0f0", color: "#333",
  border: "none", borderRadius: "6px", cursor: "pointer",
};