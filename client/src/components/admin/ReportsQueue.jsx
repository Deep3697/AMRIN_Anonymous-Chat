import { useEffect, useState } from "react";
import { fetchReports, reviewReport } from "../../api/admin.api";
import { useAuthStore } from "../../store/authStore";

const MUTE_OPTIONS = [
  { label: "1 hour", value: 60 },
  { label: "3 hours", value: 180 },
  { label: "6 hours", value: 360 },
  { label: "12 hours", value: 720 },
  { label: "24 hours", value: 1440 },
];

export default function ReportsQueue() {
  const [reports, setReports] = useState([]);
  const [muteDurations, setMuteDurations] = useState({}); // reportId -> minutes
  const [filter, setFilter] = useState("user"); // "user" | "admin"
  const user = useAuthStore((s) => s.user);
  const isGodAdmin = user?.role === "god_admin";

  useEffect(() => {
    loadReports();
  }, [filter]);

  function loadReports() {
    fetchReports(filter)
      .then((res) => setReports(res.data.reports || []))
      .catch(() => setReports([]));
  }

  async function handleReview(reportId, action) {
    const duration = muteDurations[reportId] || 60;
    await reviewReport(reportId, action, action === "muted" ? duration : undefined);
    setReports((prev) => prev.filter((r) => r._id !== reportId));
  }

  return (
    <div>
      <h3>User Reports</h3>

      {/* Filter tabs — "Admin Reports" tab only visible to God Admin */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          onClick={() => setFilter("user")}
          style={{
            padding: "6px 16px", cursor: "pointer", borderRadius: "4px",
            border: filter === "user" ? "2px solid #007bff" : "1px solid #ccc",
            backgroundColor: filter === "user" ? "#e7f1ff" : "transparent",
            fontWeight: filter === "user" ? "bold" : "normal",
            color: filter === "user" ? "#007bff" : "#555",
          }}
        >
          Member Reports
        </button>
        {isGodAdmin && (
          <button
            onClick={() => setFilter("admin")}
            style={{
              padding: "6px 16px", cursor: "pointer", borderRadius: "4px",
              border: filter === "admin" ? "2px solid #dc3545" : "1px solid #ccc",
              backgroundColor: filter === "admin" ? "#fce4ec" : "transparent",
              fontWeight: filter === "admin" ? "bold" : "normal",
              color: filter === "admin" ? "#dc3545" : "#555",
            }}
          >
            ⚠️ Admin Reports
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <p style={{ color: "#888" }}>No pending {filter === "admin" ? "admin" : "member"} reports</p>
      ) : (
        <>
          <p style={{ fontSize: "0.9em", color: "#666", marginBottom: "10px" }}>
            {reports.length} pending {filter === "admin" ? "admin" : "member"} report{reports.length !== 1 ? "s" : ""}
          </p>
          {reports.map((r) => (
            <div
              key={r._id}
              style={{
                border: filter === "admin" ? "1px solid #ef4444" : "1px solid #f59e0b",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "12px",
                backgroundColor: filter === "admin" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
              }}
            >
              <p style={{ margin: "0 0 6px", color: "#f3f4f6" }}>
                <strong>{r.reportedBy?.anonymousName}</strong> reported{" "}
                <strong style={{ color: "#ef4444" }}>
                  {r.reportedUser?.anonymousName}
                  {r.reportedUser?.role && ["main_admin", "god_admin"].includes(r.reportedUser.role) && (
                    <span style={{ fontSize: "0.8em", color: "#f59e0b", marginLeft: "4px" }}>
                      ({r.reportedUser.role === "god_admin" ? "God Admin" : "Admin"})
                    </span>
                  )}
                </strong>
                {r.groupId?.name && <> in <em style={{ color: "#a855f7" }}>{r.groupId.name}</em></>}
              </p>
              <p style={{ margin: "0 0 10px", color: "#cbd5e1" }}>Reason: "{r.reason}"</p>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {filter === "admin" ? (
                  <>
                    <select
                      value={muteDurations[r._id] || 60}
                      onChange={(e) => setMuteDurations((p) => ({ ...p, [r._id]: Number(e.target.value) }))}
                      style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc" }}
                    >
                      {MUTE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label.replace("hours", "hours").replace("hour", "hour")}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleReview(r._id, "demoted_temp")}
                      style={{ padding: "5px 12px", backgroundColor: "#ffc107", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Demote for hours
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "demoted_perm")}
                      style={{ padding: "5px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Permanently Demote
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "dismissed")}
                      style={{ padding: "5px 12px", backgroundColor: "#6c757d", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
                    {/* Mute with duration selector */}
                    <select
                      value={muteDurations[r._id] || 60}
                      onChange={(e) => setMuteDurations((p) => ({ ...p, [r._id]: Number(e.target.value) }))}
                      style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc" }}
                    >
                      {MUTE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleReview(r._id, "muted")}
                      style={{ padding: "5px 12px", backgroundColor: "#ffc107", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Mute
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "kicked")}
                      style={{ padding: "5px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Kick
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "dismissed")}
                      style={{ padding: "5px 12px", backgroundColor: "#6c757d", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
