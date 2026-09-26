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
    <form onSubmit={handleSubmit}>
      <h3>Create Batch</h3>
      <input placeholder="Label (e.g. 2024)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <input placeholder="Admission Year (e.g. 2024)" value={admissionYear} onChange={(e) => setAdmissionYear(e.target.value)} />
      <button type="submit">Create</button>
      {message && <p>{message}</p>}
    </form>
  );
}