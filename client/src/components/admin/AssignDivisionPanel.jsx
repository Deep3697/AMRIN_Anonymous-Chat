import { useEffect, useState } from "react";
import {
  fetchAllBatches,
  fetchDistinctInstitutes,
  fetchDistinctBranches,
  fetchUsersWithoutDivision,
  assignUsersToDivision,
} from "../../api/admin.api";

export default function AssignDivisionPanel() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [institutes, setInstitutes] = useState([]);
  const [institute, setInstitute] = useState("");
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [division, setDivision] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAllBatches().then((res) => setBatches(res.data.batches)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!batchId) { setInstitutes([]); setInstitute(""); return; }
    fetchDistinctInstitutes(batchId).then((res) => setInstitutes(res.data.institutes)).catch(() => {});
    setInstitute("");
    setBranches([]);
    setBranch("");
    setUsers([]);
    setSelected([]);
    setMessage("");
  }, [batchId]);

  useEffect(() => {
    if (!batchId || !institute) { setBranches([]); setBranch(""); return; }
    fetchDistinctBranches(batchId, institute).then((res) => setBranches(res.data.branches)).catch(() => {});
    setBranch("");
    setUsers([]);
    setSelected([]);
    setMessage("");
  }, [batchId, institute]);

  useEffect(() => {
    if (!batchId || !institute || !branch) { setUsers([]); return; }
    fetchUsersWithoutDivision(batchId, institute, branch)
      .then((res) => setUsers(res.data.users))
      .catch(() => {});
    setSelected([]);
    setMessage("");
  }, [batchId, institute, branch]);

  function toggleSelect(userId) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleAssign() {
    if (!batchId || !institute || !branch || !division || selected.length === 0) return;
    try {
      await assignUsersToDivision(batchId, institute, branch, selected, division);
      setMessage(`✅ ${selected.length} student(s) assigned to division "${division}".`);
      setUsers((prev) => prev.filter((u) => !selected.includes(u._id)));
      setSelected([]);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Failed to assign"}`);
    }
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>Phase 4: Assign Division</h3>
      
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Select Institute
          </label>
          <select value={institute} onChange={(e) => setInstitute(e.target.value)}>
            <option value="">Select an institute</option>
            {institutes.map((inst) => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Select Branch
          </label>
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">Select a branch</option>
            {branches.map((br) => (
              <option key={br} value={br}>{br}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Division Name
          </label>
          <input
            type="text"
            placeholder="e.g. A, B, C"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          />
        </div>
        {users.length > 0 && (
          <button onClick={handleAssign} className="admin-btn admin-btn--primary admin-btn--sm" disabled={!division || selected.length === 0}>
            Assign {selected.length > 0 ? `(${selected.length})` : ""} to Division
          </button>
        )}
      </div>

      {users.length === 0 && batchId && institute && branch && (
        <p className="admin-empty">All users in this group have a division.</p>
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
