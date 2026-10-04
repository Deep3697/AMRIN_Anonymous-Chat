import { useEffect, useState } from "react";
import {
  fetchAllBatches,
  fetchUsersWithoutInstitute,
  assignUsersToInstitute,
} from "../../api/admin.api";

export default function AssignInstitutePanel() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [institute, setInstitute] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAllBatches().then((res) => setBatches(res.data.batches)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!batchId) { setUsers([]); return; }
    fetchUsersWithoutInstitute(batchId).then((res) => setUsers(res.data.users)).catch(() => {});
    setSelected([]);
    setMessage("");
  }, [batchId]);

  function toggleSelect(userId) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleAssign() {
    if (!batchId || !institute || selected.length === 0) return;
    try {
      await assignUsersToInstitute(batchId, selected, institute);
      setMessage(`✅ ${selected.length} student(s) assigned to institute "${institute}".`);
      setUsers((prev) => prev.filter((u) => !selected.includes(u._id)));
      setSelected([]);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Failed to assign"}`);
    }
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>Phase 2: Assign Institute</h3>
      
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "200px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Select Batch
          </label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Select a batch</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "200px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Institute Name
          </label>
          <input
            type="text"
            placeholder="e.g. MIT"
            value={institute}
            onChange={(e) => setInstitute(e.target.value)}
          />
        </div>
        {users.length > 0 && (
          <button onClick={handleAssign} className="admin-btn admin-btn--primary admin-btn--sm" disabled={!institute || selected.length === 0}>
            Assign {selected.length > 0 ? `(${selected.length})` : ""} to Institute
          </button>
        )}
      </div>

      {users.length === 0 && batchId && (
        <p className="admin-empty">All users in this batch have an institute.</p>
      )}

      {users.length > 0 && (
        <div style={{ maxHeight: "300px", overflowY: "auto", borderRadius: "var(--admin-r-xs)", border: "1px solid var(--admin-border)", padding: "4px 0" }}>
          {users.map((u) => (
            <div
              key={u._id}
              className="admin-checkbox-row"
              onClick={() => toggleSelect(u._id)}
            >
              <input
                type="checkbox"
                checked={selected.includes(u._id)}
                onChange={() => toggleSelect(u._id)}
                onClick={(e) => e.stopPropagation()}
              />
              <span><strong style={{ color: "var(--admin-text)" }}>{u.anonymousName}</strong> — <span style={{ color: "var(--admin-text-3)" }}>{u.email}</span></span>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className={`admin-status-msg ${message.startsWith("✅") ? "admin-status-msg--success" : "admin-status-msg--error"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
