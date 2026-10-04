import { useEffect, useState } from "react";
import { fetchPendingRequests, reviewRequest } from "../../api/admin.api";

export default function PendingRequestsQueue() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchPendingRequests()
      .then((res) => setRequests(res.data.requests))
      .catch(() => {});
  }, []);

  async function handleReview(requestId, decision) {
    await reviewRequest(requestId, decision);
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>Pending Requests</h3>
      
      {requests.length === 0 ? (
        <p className="admin-empty">No pending requests.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {requests.map((r) => (
            <div key={r._id} className="admin-report-card admin-report-card--info">
              <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--admin-text)" }}>
                <strong style={{ color: "var(--admin-primary)" }}>{r.requestedBy.anonymousName}</strong> wants to{" "}
                <span style={{ 
                  padding: "2px 8px", 
                  borderRadius: "var(--admin-r-pill)", 
                  background: "var(--admin-warning-soft)", 
                  color: "var(--admin-warning)",
                  fontSize: "10px",
                  fontWeight: "700"
                }}>
                  {r.action}
                </span>{" "}
                <strong style={{ color: "var(--admin-text)" }}>{r.targetUserId.anonymousName}</strong>
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleReview(r._id, "approved")}
                  className="admin-btn admin-btn--success admin-btn--sm"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleReview(r._id, "rejected")}
                  className="admin-btn admin-btn--danger admin-btn--sm"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}