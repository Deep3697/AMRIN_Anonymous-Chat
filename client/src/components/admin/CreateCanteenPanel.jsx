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
      setStatus("Canteen created successfully!");
      setName("");
      setLocation("");
    } catch (err) {
      setStatus(err.response?.data?.error || "Failed to create canteen");
    }
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <h2>Create New Canteen</h2>
      <form onSubmit={handleCreate} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input 
          type="text" 
          placeholder="Canteen Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
        />
        <input 
          type="text" 
          placeholder="Location (Optional)" 
          value={location} 
          onChange={(e) => setLocation(e.target.value)} 
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
        />
        <button type="submit" style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Create Canteen
        </button>
      </form>
      {status && <p style={{ marginTop: "10px", fontSize: "0.9em", color: status.includes("success") ? "green" : "red" }}>{status}</p>}
    </div>
  );
}
