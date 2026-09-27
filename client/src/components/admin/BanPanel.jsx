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
      <h3>🚫 Ban Management</h3>

      {/* Search & Ban */}
      <div style={{ marginBottom: "16px" }}>
        <h4>Ban a User</h4>
        <div style={{ position: "relative", maxWidth: "350px" }}>
          <input
            type="text"
            placeholder="🔍 Search user by name..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser(null); }}
            style={{
              padding: "8px 12px", borderRadius: "6px", width: "100%",
              border: "1px solid #ddd", fontSize: "0.9em", outline: "none",
              boxSizing: "border-box"
            }}
          />
          {searchQuery.trim().length >= 2 && !selectedUser && (
            <div style={{
              position: "absolute", top: "100%", left: 0, width: "100%",
              backgroundColor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              borderRadius: "4px", marginTop: "4px", zIndex: 1000,
              maxHeight: "200px", overflowY: "auto"
            }}>
              {searching ? (
                <div style={{ padding: "8px", color: "#888", fontSize: "0.85em" }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: "8px", color: "#888", fontSize: "0.85em" }}>No users found</div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => { setSelectedUser(u); setSearchQuery(u.anonymousName); setSearchResults([]); }}
                    style={{
                      padding: "8px 12px", cursor: "pointer", fontSize: "0.9em",
                      borderBottom: "1px solid #f0f0f0", display: "flex",
                      justifyContent: "space-between", alignItems: "center"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f7ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <strong>{u.anonymousName}</strong>
                    <span style={{ fontSize: "0.8em", color: "#888" }}>{u.role}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {selectedUser && (
          <div style={{ marginTop: "12px", padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px", maxWidth: "350px" }}>
            <p style={{ margin: "0 0 8px", fontWeight: "bold" }}>
              Banning: {selectedUser.anonymousName} ({selectedUser.role})
            </p>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc", width: "100%", marginBottom: "8px" }}
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
              style={{ padding: "6px", borderRadius: "4px", border: "1px solid #ccc", width: "100%", marginBottom: "8px", boxSizing: "border-box" }}
            />
            <button
              onClick={handleBan}
              style={{
                padding: "8px 16px", backgroundColor: "#dc3545", color: "white",
                border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
              }}
            >
              🚫 Ban User
            </button>
          </div>
        )}
      </div>

      {message && (
        <p style={{ fontSize: "0.9em", color: message.startsWith("✅") ? "#28a745" : "#dc3545", margin: "8px 0" }}>
          {message}
        </p>
      )}

      {/* Banned Users List */}
      <h4>Currently Banned Users ({bannedUsers.length})</h4>
      {bannedUsers.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9em" }}>No users currently banned.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
              <th style={{ padding: "8px" }}>User</th>
              <th style={{ padding: "8px" }}>Role</th>
              <th style={{ padding: "8px" }}>Banned By</th>
              <th style={{ padding: "8px" }}>Duration</th>
              <th style={{ padding: "8px" }}>Expires</th>
              <th style={{ padding: "8px" }}>Reason</th>
              {isGodAdmin && <th style={{ padding: "8px" }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {bannedUsers.map((ban) => (
              <tr key={ban._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px", fontWeight: "bold" }}>{ban.userId?.anonymousName || "Deleted"}</td>
                <td style={{ padding: "8px" }}>{ban.userId?.role || "-"}</td>
                <td style={{ padding: "8px" }}>{ban.bannedBy?.anonymousName || "System"}</td>
                <td style={{ padding: "8px" }}>
                  {DURATIONS.find((d) => d.value === ban.duration)?.label || ban.duration}
                </td>
                <td style={{ padding: "8px" }}>
                  {ban.expiresAt ? new Date(ban.expiresAt).toLocaleDateString() : "Never"}
                </td>
                <td style={{ padding: "8px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ban.reason || "-"}
                </td>
                {isGodAdmin && (
                  <td style={{ padding: "8px" }}>
                    <button
                      onClick={() => handleRevoke(ban._id)}
                      style={{
                        padding: "4px 10px", backgroundColor: "#28a745", color: "white",
                        border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85em"
                      }}
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
