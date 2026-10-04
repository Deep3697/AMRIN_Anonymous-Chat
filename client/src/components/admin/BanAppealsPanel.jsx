import { useState, useEffect } from "react";
import { fetchPendingAppeals, reviewBanAppeal } from "../../api/banAppeal.api";

export default function BanAppealsPanel() {
  const [appeals, setAppeals] = useState([]);
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});

  useEffect(() => {
    loadAppeals();
  }, []);

  async function loadAppeals() {
    try {
      const res = await fetchPendingAppeals();
      setAppeals(res.data.appeals || []);
    } catch {
      setAppeals([]);
    }
  }

  async function handleReview(appealId, decision) {
    try {
      await reviewBanAppeal(appealId, decision, reviewNotes[appealId] || "");
      setMessage(`✅ Appeal ${decision}.`);
      loadAppeals();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Failed to review"}`);
    }
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>📝 Ban Appeals (God Admin Only)</h3>

      {message && (
        <p className={`admin-status-msg ${message.startsWith("✅") ? "admin-status-msg--success" : "admin-status-msg--error"}`}>
          {message}
        </p>
      )}

      {appeals.length === 0 ? (
        <p className="admin-empty">No pending ban appeals.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {appeals.map((appeal, idx) => (
            <div
              key={appeal._id}
              className="admin-report-card admin-report-card--warning"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ color: "var(--admin-text)", fontSize: "13px" }}>
                  {appeal.userId?.anonymousName || "Unknown"}
                </strong>
                <span style={{ fontSize: "10px", color: "var(--admin-text-3)" }}>
                  {new Date(appeal.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--admin-text-2)" }}>
                <strong style={{ color: "var(--admin-text-3)" }}>Reason:</strong> {appeal.reason}
              </p>
              <input
                type="text"
                placeholder="Add a review note (optional)..."
                value={reviewNotes[appeal._id] || ""}
                onChange={(e) => setReviewNotes({ ...reviewNotes, [appeal._id]: e.target.value })}
                style={{ width: "100%", marginBottom: "12px", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleReview(appeal._id, "approved")}
                  className="admin-btn admin-btn--success admin-btn--sm"
                >
                  ✅ Approve & Unban
                </button>
                <button
                  onClick={() => handleReview(appeal._id, "rejected")}
                  className="admin-btn admin-btn--danger admin-btn--sm"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
