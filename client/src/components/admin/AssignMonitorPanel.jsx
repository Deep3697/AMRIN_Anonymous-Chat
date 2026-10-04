import { useState, useEffect } from "react";
import { assignMonitor } from "../../api/admin.api";
import { fetchMyGroups } from "../../api/group.api";
import { searchUsersForBan } from "../../api/ban.api";

export default function AssignMonitorPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchMyGroups()
      .then((res) => setGroups(res.data.groups || []))
      .catch(() => {});
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

  async function handleAssign() {
    if (!selectedUser || !groupId) return;
    try {
      await assignMonitor(selectedUser._id, groupId);
      setMessage(`✅ ${selectedUser.anonymousName} promoted to Chat Monitor.`);
      setSelectedUser(null);
      setSearchQuery("");
      setGroupId("");
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || "Failed to assign monitor"}`);
    }
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>🛡️ Assign Chat Monitor</h3>
      <p style={{ fontSize: "11px", color: "var(--admin-text-3)", marginBottom: "14px" }}>
        Promote a member to chat monitor for a specific group. They gain moderation abilities within that group.
      </p>

      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* User Search */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)", display: "block", marginBottom: "4px" }}>
            Search User
          </label>
          <input
            type="text"
            placeholder="🔍 Search by name..."
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

        {/* Group Selector */}
        <div style={{ minWidth: "220px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)", display: "block", marginBottom: "4px" }}>
            Assign to Group
          </label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Select a group</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div style={{ alignSelf: "flex-end" }}>
          <button
            onClick={handleAssign}
            className="admin-btn admin-btn--primary"
            disabled={!selectedUser || !groupId}
          >
            🛡️ Assign Monitor
          </button>
        </div>
      </div>

      {selectedUser && (
        <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--admin-text-2)" }}>
          Selected: <strong style={{ color: "var(--admin-primary)" }}>{selectedUser.anonymousName}</strong>{" "}
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
