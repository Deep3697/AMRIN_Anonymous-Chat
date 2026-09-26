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
      setMessage(`${selected.length} student(s) assigned to division "${division}".`);
      setUsers((prev) => prev.filter((u) => !selected.includes(u._id)));
      setSelected([]);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to assign");
    }
  }

  return (
    <div>
      <h3>Phase 4: Assign Division</h3>
      <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
        <option value="">Select a batch</option>
        {batches.map((b) => (
          <option key={b._id} value={b._id}>{b.label}</option>
        ))}
      </select>
      <select value={institute} onChange={(e) => setInstitute(e.target.value)}>
        <option value="">Select an institute</option>
        {institutes.map((inst) => (
          <option key={inst} value={inst}>{inst}</option>
        ))}
      </select>
      <select value={branch} onChange={(e) => setBranch(e.target.value)}>
        <option value="">Select a branch</option>
        {branches.map((br) => (
          <option key={br} value={br}>{br}</option>
        ))}
      </select>
      <input
        placeholder="Division name (e.g. A, B, C)"
        value={division}
        onChange={(e) => setDivision(e.target.value)}
      />
      {users.length === 0 && batchId && institute && branch && (
        <p>All users in this group have a division.</p>
      )}
      {users.map((u) => (
        <div key={u._id}>
          <input
            type="checkbox"
            checked={selected.includes(u._id)}
            onChange={() => toggleSelect(u._id)}
          />
          <span>{u.anonymousName} — {u.email}</span>
        </div>
      ))}
      {users.length > 0 && (
        <button onClick={handleAssign}>Assign Selected to Division</button>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
