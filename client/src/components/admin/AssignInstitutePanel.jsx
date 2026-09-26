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
      setMessage(`${selected.length} student(s) assigned to institute "${institute}".`);
      setUsers((prev) => prev.filter((u) => !selected.includes(u._id)));
      setSelected([]);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to assign");
    }
  }

  return (
    <div>
      <h3>Phase 2: Assign Institute</h3>
      <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
        <option value="">Select a batch</option>
        {batches.map((b) => (
          <option key={b._id} value={b._id}>{b.label}</option>
        ))}
      </select>
      <input
        placeholder="Institute name (e.g. MIT)"
        value={institute}
        onChange={(e) => setInstitute(e.target.value)}
      />
      {users.length === 0 && batchId && <p>All users in this batch have an institute.</p>}
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
        <button onClick={handleAssign}>Assign Selected to Institute</button>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
