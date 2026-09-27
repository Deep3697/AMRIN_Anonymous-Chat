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
      <h3>🔇 Mute Management</h3>

      {message && (
        <p style={{ fontSize: "0.9em", color: message.startsWith("✅") ? "#28a745" : "#dc3545", margin: "8px 0" }}>
          {message}
        </p>
      )}

      {mutedUsers.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9em" }}>No users currently muted.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
              <th style={{ padding: "8px" }}>User</th>
              <th style={{ padding: "8px" }}>Role</th>
              <th style={{ padding: "8px" }}>Muted Until</th>
              <th style={{ padding: "8px" }}>Time Remaining</th>
              <th style={{ padding: "8px" }}>Offences</th>
              <th style={{ padding: "8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {mutedUsers.map((u) => (
              <tr key={u._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px", fontWeight: "bold" }}>{u.anonymousName}</td>
                <td style={{ padding: "8px" }}>{u.role}</td>
                <td style={{ padding: "8px" }}>{new Date(u.mutedUntil).toLocaleString()}</td>
                <td style={{ padding: "8px", color: "#e67e22" }}>{getTimeRemaining(u.mutedUntil)}</td>
                <td style={{ padding: "8px" }}>{u.offenceCount}</td>
                <td style={{ padding: "8px" }}>
                  <button
                    onClick={() => handleUnmute(u._id, u.anonymousName)}
                    style={{
                      padding: "4px 12px", backgroundColor: "#28a745", color: "white",
                      border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85em"
                    }}
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
