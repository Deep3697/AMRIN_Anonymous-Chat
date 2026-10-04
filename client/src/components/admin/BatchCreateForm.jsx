import { useState } from "react";
import { createBatch } from "../../api/admin.api";

export default function BatchCreateForm({ onBatchCreated }) {
  const [label, setLabel] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await createBatch({ label, admissionYear: admissionYear ? Number(admissionYear) : undefined });
      setMessage(`Batch "${label.toUpperCase()}" created with default groups.`);
      setLabel("");
      setAdmissionYear("");
      if (onBatchCreated) onBatchCreated();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to create batch");
    }
  }

  return (
    <div>
      <h3 className="admin-panel-title" style={{ marginBottom: "16px" }}>🎓 Create Batch</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Batch Label
          </label>
          <input
            type="text"
            placeholder="e.g. 2024"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-text-3)" }}>
            Admission Year
          </label>
          <input
            type="text"
            placeholder="e.g. 2024"
            value={admissionYear}
            onChange={(e) => setAdmissionYear(e.target.value)}
          />
        </div>
        <button type="submit" className="admin-btn admin-btn--primary">
          Create Batch
        </button>
      </form>
      {message && (
        <p className={`admin-status-msg ${message.includes("created") ? "admin-status-msg--success" : "admin-status-msg--error"}`}>
          {message}
        </p>
      )}
    </div>
  );
}