import { useState, useEffect } from "react";
import { fetchMutedUsers, unmuteUser } from "../../api/mute.api";

export default function MutePanel() {
  const [mutedUsers, setMutedUsers] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMutedUsers();
  }, []);

  async function loadMutedUsers() {
    try {
      const res = await fetchMutedUsers();
      setMutedUsers(res.data.users || []);
    } catch {
      setMutedUsers([]);
    }
  }

  async function handleUnmute(userId, name) {
    try {
      await unmuteUser(userId);
      setMessage(`✅ ${name} has been unmuted.`);
      loadMutedUsers();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Failed to unmute"}`);
    }
  }

  function getTimeRemaining(mutedUntil) {
    const diff = new Date(mutedUntil) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>🔇 Mute Management</h3>

      {message && (
        <p className={`admin-status-msg ${message.startsWith("✅") ? "admin-status-msg--success" : "admin-status-msg--error"}`}>
          {message}
        </p>
      )}

      {mutedUsers.length === 0 ? (
        <p className="admin-empty">No users currently muted.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Muted Until</th>
              <th>Time Remaining</th>
              <th>Offences</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mutedUsers.map((u) => (
              <tr key={u._id}>
                <td>{u.anonymousName}</td>
                <td>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "var(--admin-r-pill)",
                    background: "var(--admin-primary-soft)",
                    color: "var(--admin-primary)",
                    fontSize: "10px",
                    fontWeight: "700"
                  }}>
                    {u.role}
                  </span>
                </td>
                <td>{new Date(u.mutedUntil).toLocaleString()}</td>
                <td style={{ color: "var(--admin-warning)" }}>{getTimeRemaining(u.mutedUntil)}</td>
                <td>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "var(--admin-r-pill)",
                    background: u.offenceCount > 2 ? "var(--admin-danger-soft)" : "var(--admin-warning-soft)",
                    color: u.offenceCount > 2 ? "var(--admin-danger)" : "var(--admin-warning)",
                    fontSize: "10px",
                    fontWeight: "800"
                  }}>
                    {u.offenceCount}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleUnmute(u._id, u.anonymousName)}
                    className="admin-btn admin-btn--success admin-btn--sm"
                  >
                    🔊 Release Mute
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
