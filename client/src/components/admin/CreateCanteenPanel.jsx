import { useState } from "react";
import { createCanteen } from "../../api/canteen.api";

export default function CreateCanteenPanel() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    setStatus("Creating...");
    try {
      await createCanteen(name, location);
      setStatus("✅ Canteen created successfully!");
      setName("");
      setLocation("");
    } catch (err) {
      setStatus(`❌ ${err.response?.data?.error || "Failed to create canteen"}`);
    }
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>🍽️ Create New Canteen</h3>
      <form onSubmit={handleCreate} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Canteen Name
          </label>
          <input
            type="text"
            placeholder="e.g. Main Cafeteria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Location (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Building A, Ground Floor"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <button type="submit" className="admin-btn admin-btn--primary">
          Create Canteen
        </button>
      </form>
      {status && (
        <p className={`admin-status-msg ${status.startsWith("✅") ? "admin-status-msg--success" : status.startsWith("❌") ? "admin-status-msg--error" : ""}`}
          style={!status.startsWith("✅") && !status.startsWith("❌") ? { color: "var(--admin-text-3)", background: "transparent", border: "none" } : {}}
        >
          {status}
        </p>
      )}
    </div>
  );
}
