import { useEffect, useState } from "react";
import { fetchUnassignedUsers, assignUsersToBatch, fetchAllBatches } from "../../api/admin.api";

export default function UnassignedUsersList({ refreshKey }) {
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selected, setSelected] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUnassignedUsers().then((res) => setUsers(res.data.users)).catch(() => {});
    fetchAllBatches().then((res) => setBatches(res.data.batches)).catch(() => {});
  }, [refreshKey]);

  function toggleSelect(userId) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleAssign() {
    if (!batchId || selected.length === 0) return;
    try {
      await assignUsersToBatch(batchId, selected);
      setMessage(`${selected.length} student(s) assigned to batch.`);
      setUsers((prev) => prev.filter((u) => !selected.includes(u._id)));
      setSelected([]);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to assign");
    }
  }

  return (
    <div>
      <h3>Phase 1: Assign Users to Batch</h3>
      {users.length === 0 && <p>No unassigned users.</p>}
      <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
        <option value="">Select a batch</option>
        {batches.map((b) => (
          <option key={b._id} value={b._id}>{b.label}</option>
        ))}
      </select>
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
        <button onClick={handleAssign}>Assign Selected to Batch</button>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}