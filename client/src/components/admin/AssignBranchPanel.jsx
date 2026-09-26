import { useEffect, useState } from "react";
import {
  fetchAllBatches,
  fetchDistinctInstitutes,
  fetchUsersWithoutBranch,
  assignUsersToBranch,
} from "../../api/admin.api";

export default function AssignBranchPanel() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [institutes, setInstitutes] = useState([]);
  const [institute, setInstitute] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [branch, setBranch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAllBatches().then((res) => setBatches(res.data.batches)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!batchId) { setInstitutes([]); setInstitute(""); return; }
    fetchDistinctInstitutes(batchId).then((res) => setInstitutes(res.data.institutes)).catch(() => {});
    setInstitute("");
    setUsers([]);
    setSelected([]);
    setMessage("");
  }, [batchId]);

  useEffect(() => {
    if (!batchId || !institute) { setUsers([]); return; }
    fetchUsersWithoutBranch(batchId, institute).then((res) => setUsers(res.data.users)).catch(() => {});
    setSelected([]);
    setMessage("");
  }, [batchId, institute]);

  function toggleSelect(userId) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleAssign() {
    if (!batchId || !institute || !branch || selected.length === 0) return;
    try {
      await assignUsersToBranch(batchId, institute, selected, branch);
      setMessage(`${selected.length} student(s) assigned to branch "${branch}".`);
      setUsers((prev) => prev.filter((u) => !selected.includes(u._id)));
      setSelected([]);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to assign");
    }
  }

  return (
    <div>
      <h3>Phase 3: Assign Branch</h3>
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
      <input
        placeholder="Branch name (e.g. BCE)"
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
      />
      {users.length === 0 && batchId && institute && <p>All users in this group have a branch.</p>}
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
        <button onClick={handleAssign}>Assign Selected to Branch</button>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
