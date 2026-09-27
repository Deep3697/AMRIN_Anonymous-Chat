import { useState, useEffect } from "react";
import { submitBanAppeal, getMyAppealStatus } from "../../api/banAppeal.api";

export default function BanAppealModal() {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [existingAppeal, setExistingAppeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAppealStatus()
      .then((res) => setExistingAppeal(res.data.appeal))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!reason.trim()) return;
    try {
      const res = await submitBanAppeal(reason.trim());
      setMessage("✅ " + (res.data.message || "Appeal submitted."));
      setExistingAppeal(res.data.appeal);
      setReason("");
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.error || "Failed to submit appeal"));
    }
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 8px", color: "#dc3545" }}>🚫 You Have Been Banned</h2>
        <p style={{ color: "#666", fontSize: "0.9em", margin: "0 0 20px" }}>
          You cannot access the chat while banned. If you believe this is a mistake,
          you can submit an appeal to the God Admin.
        </p>

        {existingAppeal && existingAppeal.status === "pending" ? (
          <div style={{ padding: "16px", backgroundColor: "#fff3cd", borderRadius: "8px", border: "1px solid #ffc107" }}>
            <p style={{ margin: 0, fontWeight: "bold", color: "#856404" }}>⏳ Your appeal is pending review</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.85em", color: "#856404" }}>
              Submitted: {new Date(existingAppeal.createdAt).toLocaleString()}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "0.85em", color: "#856404" }}>
              Reason: "{existingAppeal.reason}"
            </p>
          </div>
        ) : existingAppeal && existingAppeal.status === "rejected" ? (
          <>
            <div style={{ padding: "16px", backgroundColor: "#f8d7da", borderRadius: "8px", border: "1px solid #f5c6cb", marginBottom: "16px" }}>
              <p style={{ margin: 0, fontWeight: "bold", color: "#721c24" }}>❌ Your previous appeal was rejected</p>
              {existingAppeal.reviewNote && (
                <p style={{ margin: "4px 0 0", fontSize: "0.85em", color: "#721c24" }}>
                  Note: {existingAppeal.reviewNote}
                </p>
              )}
            </div>
            {/* Allow resubmission */}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why your ban should be lifted..."
              rows={4}
              style={textareaStyle}
            />
            <button onClick={handleSubmit} style={submitBtnStyle}>📩 Submit New Appeal</button>
          </>
        ) : (
          <>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why your ban should be lifted..."
              rows={4}
              style={textareaStyle}
            />
            <button onClick={handleSubmit} style={submitBtnStyle}>📩 Submit Appeal to God Admin</button>
          </>
        )}

        {message && (
          <p style={{ marginTop: "12px", fontSize: "0.85em", color: message.startsWith("✅") ? "#28a745" : "#dc3545" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const containerStyle = {
  display: "flex", justifyContent: "center", alignItems: "center",
  height: "100vh", backgroundColor: "#f5f5f5",
};

const cardStyle = {
  backgroundColor: "white", padding: "32px", borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxWidth: "480px", width: "100%",
};

const textareaStyle = {
  width: "100%", padding: "10px", borderRadius: "6px",
  border: "1px solid #ddd", fontSize: "0.9em", resize: "vertical",
  outline: "none", boxSizing: "border-box", marginBottom: "12px",
};

const submitBtnStyle = {
  padding: "10px 20px", backgroundColor: "#007bff", color: "white",
  border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold",
  fontSize: "0.95em",
};
