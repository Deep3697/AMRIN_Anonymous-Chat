import { useState } from "react";
import socket from "../../socket/socketClient";

export default function PollCreator({ threadId, threadType, onClose }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function updateOption(i, value) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function createPoll() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;
    socket.emit("poll:create", { threadId, threadType, question: question.trim(), options: cleanOptions });
    onClose();
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "white", borderRadius: "10px", padding: "20px", width: "360px" }}>
        <h3 style={{ marginTop: 0 }}>Create Poll</h3>
        <input placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" }} />
        {options.map((opt, i) => (
          <input key={i} placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => updateOption(i, e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "8px", boxSizing: "border-box" }} />
        ))}
        <button type="button" onClick={() => setOptions((prev) => [...prev, ""])} style={{ marginBottom: "12px" }}>+ Add option</button>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={createPoll} style={{ backgroundColor: "#007bff", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px" }}>Create</button>
        </div>
      </div>
    </div>
  );
}