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
      <h3>📝 Ban Appeals (God Admin Only)</h3>

      {message && (
        <p style={{ fontSize: "0.9em", color: message.startsWith("✅") ? "#28a745" : "#dc3545", margin: "8px 0" }}>
          {message}
        </p>
      )}

      {appeals.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9em" }}>No pending ban appeals.</p>
      ) : (
        appeals.map((appeal) => (
          <div
            key={appeal._id}
            style={{
              padding: "16px", border: "1px solid #e0e0e0", borderRadius: "8px",
              marginBottom: "12px", backgroundColor: "#fafafa"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{appeal.userId?.anonymousName || "Unknown"}</strong>
              <span style={{ fontSize: "0.8em", color: "#888" }}>
                {new Date(appeal.createdAt).toLocaleString()}
              </span>
            </div>
            <p style={{ margin: "8px 0", fontSize: "0.9em", color: "#333" }}>
              <strong>Reason:</strong> {appeal.reason}
            </p>
            <input
              type="text"
              placeholder="Add a note (optional)..."
              value={reviewNotes[appeal._id] || ""}
              onChange={(e) => setReviewNotes({ ...reviewNotes, [appeal._id]: e.target.value })}
              style={{
                padding: "6px", borderRadius: "4px", border: "1px solid #ccc",
                width: "100%", marginBottom: "8px", boxSizing: "border-box", fontSize: "0.85em"
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleReview(appeal._id, "approved")}
                style={{
                  padding: "6px 14px", backgroundColor: "#28a745", color: "white",
                  border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
                }}
              >
                ✅ Approve & Unban
              </button>
              <button
                onClick={() => handleReview(appeal._id, "rejected")}
                style={{
                  padding: "6px 14px", backgroundColor: "#dc3545", color: "white",
                  border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
                }}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
