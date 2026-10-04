import { useState, useEffect } from "react";
import { banUser, revokeBan, fetchBannedUsers, searchUsersForBan } from "../../api/ban.api";
import { useAuthStore } from "../../store/authStore";

const DURATIONS = [
  { value: "1d", label: "1 Day" },
  { value: "3d", label: "3 Days" },
  { value: "7d", label: "7 Days" },
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "permanent", label: "Permanent" },
];

export default function BanPanel() {
  const user = useAuthStore((s) => s.user);
  const isGodAdmin = user?.role === "god_admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [duration, setDuration] = useState("1d");
  const [reason, setReason] = useState("");
  const [bannedUsers, setBannedUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadBannedUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsersForBan(searchQuery.trim());
        setSearchResults(res.data.users || []);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadBannedUsers() {
    try {
      const res = await fetchBannedUsers();
      setBannedUsers(res.data.bans || []);
    } catch {
      setBannedUsers([]);
    }
  }

  async function handleBan() {
    if (!selectedUser) return;
    try {
      await banUser(selectedUser._id, reason, duration);
      setMessage(`✅ ${selectedUser.anonymousName} has been banned.`);
      setSelectedUser(null);
      setReason("");
      setSearchQuery("");
      setSearchResults([]);
      loadBannedUsers();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Failed to ban user"}`);
    }
  }

  async function handleRevoke(banId) {
    try {
      await revokeBan(banId);
      setMessage("✅ Ban revoked successfully.");
      loadBannedUsers();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Failed to revoke ban"}`);
    }
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>🚫 Ban Management</h3>

      {/* Search & Ban */}
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ fontSize: "13px", marginBottom: "12px", color: "var(--admin-text)" }}>Ban a User</h4>
        <div style={{ position: "relative", maxWidth: "380px" }}>
          <input
            type="text"
            placeholder="🔍 Search user by name..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser(null); }}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          {searchQuery.trim().length >= 2 && !selectedUser && (
            <div className="admin-search-dropdown">
              {searching ? (
                <div style={{ padding: "10px 14px", color: "var(--admin-text-3)", fontSize: "12px" }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: "10px 14px", color: "var(--admin-text-3)", fontSize: "12px" }}>No users found</div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => { setSelectedUser(u); setSearchQuery(u.anonymousName); setSearchResults([]); }}
                    className="admin-search-item"
                  >
                    <strong>{u.anonymousName}</strong>
                    <span className="admin-role-tag">{u.role}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="admin-selected-user-card">
            <p className="admin-selected-user-name">
              Banning: <span style={{ color: "var(--admin-danger)" }}>{selectedUser.anonymousName}</span>{" "}
              <span style={{
                padding: "2px 8px",
                borderRadius: "var(--admin-r-pill)",
                background: "var(--admin-primary-soft)",
                color: "var(--admin-primary)",
                fontSize: "10px",
                fontWeight: "700"
              }}>
                {selectedUser.role}
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Reason for ban (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ boxSizing: "border-box" }}
              />
              <button
                onClick={handleBan}
                className="admin-btn admin-btn--danger"
              >
                🚫 Ban User
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <p className={`admin-status-msg ${message.startsWith("✅") ? "admin-status-msg--success" : "admin-status-msg--error"}`}>
          {message}
        </p>
      )}

      {/* Banned Users List */}
      <h4 style={{ fontSize: "13px", marginBottom: "12px", color: "var(--admin-text)" }}>
        Currently Banned Users ({bannedUsers.length})
      </h4>
      {bannedUsers.length === 0 ? (
        <p className="admin-empty">No users currently banned.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Banned By</th>
              <th>Duration</th>
              <th>Expires</th>
              <th>Reason</th>
              {isGodAdmin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {bannedUsers.map((ban) => (
              <tr key={ban._id}>
                <td>{ban.userId?.anonymousName || "Deleted"}</td>
                <td>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "var(--admin-r-pill)",
                    background: "var(--admin-primary-soft)",
                    color: "var(--admin-primary)",
                    fontSize: "10px",
                    fontWeight: "700"
                  }}>
                    {ban.userId?.role || "-"}
                  </span>
                </td>
                <td>{ban.bannedBy?.anonymousName || "System"}</td>
                <td>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "var(--admin-r-pill)",
                    background: ban.duration === "permanent" ? "var(--admin-danger-soft)" : "var(--admin-warning-soft)",
                    color: ban.duration === "permanent" ? "var(--admin-danger)" : "var(--admin-warning)",
                    fontSize: "10px",
                    fontWeight: "700"
                  }}>
                    {DURATIONS.find((d) => d.value === ban.duration)?.label || ban.duration}
                  </span>
                </td>
                <td>{ban.expiresAt ? new Date(ban.expiresAt).toLocaleDateString() : "Never"}</td>
                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ban.reason || "—"}
                </td>
                {isGodAdmin && (
                  <td>
                    <button
                      onClick={() => handleRevoke(ban._id)}
                      className="admin-btn admin-btn--success admin-btn--sm"
                    >
                      Revoke
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
