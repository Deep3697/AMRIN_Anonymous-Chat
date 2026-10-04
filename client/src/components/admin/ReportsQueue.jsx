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
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>User Reports</h3>

      {/* Filter tabs */}
      <div className="admin-filter-tabs">
        <button
          onClick={() => setFilter("user")}
          className={`admin-filter-tab ${filter === "user" ? "admin-filter-tab--active" : ""}`}
        >
          Member Reports
        </button>
        {isGodAdmin && (
          <button
            onClick={() => setFilter("admin")}
            className={`admin-filter-tab ${filter === "admin" ? "admin-filter-tab--danger-active" : ""}`}
          >
            ⚠️ Admin Reports
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <p className="admin-empty">No pending {filter === "admin" ? "admin" : "member"} reports</p>
      ) : (
        <>
          <p style={{ fontSize: "11px", color: "var(--admin-text-3)", marginBottom: "14px" }}>
            {reports.length} pending {filter === "admin" ? "admin" : "member"} report{reports.length !== 1 ? "s" : ""}
          </p>
          {reports.map((r, idx) => (
            <div
              key={r._id}
              className={`admin-report-card ${filter === "admin" ? "admin-report-card--danger" : "admin-report-card--warning"}`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <p style={{ margin: "0 0 6px", color: "var(--admin-text)", fontSize: "12px" }}>
                <strong style={{ color: "var(--admin-primary)" }}>{r.reportedBy?.anonymousName}</strong> reported{" "}
                <strong style={{ color: "var(--admin-danger)" }}>
                  {r.reportedUser?.anonymousName}
                  {r.reportedUser?.role && ["main_admin", "god_admin"].includes(r.reportedUser.role) && (
                    <span style={{
                      fontSize: "9px",
                      marginLeft: "4px",
                      padding: "2px 8px",
                      borderRadius: "var(--admin-r-pill)",
                      background: "var(--admin-warning-soft)",
                      color: "var(--admin-warning)",
                      fontWeight: "700"
                    }}>
                      {r.reportedUser.role === "god_admin" ? "God Admin" : "Admin"}
                    </span>
                  )}
                </strong>
                {r.groupId?.name && <> in <em style={{ color: "var(--admin-accent)" }}>{r.groupId.name}</em></>}
              </p>
              <p style={{ margin: "0 0 12px", color: "var(--admin-text-2)", fontSize: "11px" }}>
                Reason: "{r.reason}"
              </p>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {filter === "admin" ? (
                  <>
                    <select
                      value={muteDurations[r._id] || 60}
                      onChange={(e) => setMuteDurations((p) => ({ ...p, [r._id]: Number(e.target.value) }))}
                    >
                      {MUTE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleReview(r._id, "demoted_temp")}
                      className="admin-btn admin-btn--warning admin-btn--sm"
                    >
                      Demote for hours
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "demoted_perm")}
                      className="admin-btn admin-btn--danger admin-btn--sm"
                    >
                      Permanently Demote
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "dismissed")}
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
                    <select
                      value={muteDurations[r._id] || 60}
                      onChange={(e) => setMuteDurations((p) => ({ ...p, [r._id]: Number(e.target.value) }))}
                    >
                      {MUTE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleReview(r._id, "muted")}
                      className="admin-btn admin-btn--warning admin-btn--sm"
                    >
                      Mute
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "kicked")}
                      className="admin-btn admin-btn--danger admin-btn--sm"
                    >
                      Kick
                    </button>
                    <button
                      onClick={() => handleReview(r._id, "dismissed")}
                      className="admin-btn admin-btn--ghost admin-btn--sm"
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
