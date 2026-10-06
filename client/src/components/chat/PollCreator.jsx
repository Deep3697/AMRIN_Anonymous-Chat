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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="modal-card" style={{ width: "min(380px, calc(100vw - 24px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner">
          <div className="modal-header-row">
            <div className="modal-title">📊 Create Poll</div>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>

          <input
            className="modal-input"
            placeholder="What's your question?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          {options.map((opt, i) => (
            <input
              key={i}
              className="modal-input"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              style={{ marginBottom: 7 }}
            />
          ))}

          <button
            type="button"
            className="modal-btn"
            onClick={() => setOptions((prev) => [...prev, ""])}
            style={{ marginBottom: 10, width: "100%" }}
          >
            + Add Option
          </button>

          <div className="modal-btn-row">
            <button type="button" className="modal-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="modal-btn modal-btn--primary" onClick={createPoll}>Create Poll</button>
          </div>
        </div>
      </div>
    </div>
  );
}