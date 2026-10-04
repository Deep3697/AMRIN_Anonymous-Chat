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
      <div className="chat-app" style={{ display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--text-3)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="chat-app" style={{ display: "grid", placeItems: "center" }}>
      <div className="modal-card" style={{ width: 480, animation: "modalOpenClean 460ms var(--spring) both" }}>
        <div className="modal-inner">
          <div className="modal-title" style={{ color: "var(--danger)" }}>🚫 You Have Been Banned</div>
          <p className="modal-subtitle">
            You cannot access the chat while banned. If you believe this is a mistake,
            you can submit an appeal to the God Admin.
          </p>

          {existingAppeal && existingAppeal.status === "pending" ? (
            <div style={{
              padding: 14, borderRadius: 12,
              background: "var(--warning-soft)", border: "1px solid var(--warning)"
            }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: "11px", color: "var(--warning)" }}>⏳ Your appeal is pending review</p>
              <p style={{ margin: "6px 0 0", fontSize: "10px", color: "var(--text-2)" }}>
                Submitted: {new Date(existingAppeal.createdAt).toLocaleString()}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: "10px", color: "var(--text-2)" }}>
                Reason: "{existingAppeal.reason}"
              </p>
            </div>
          ) : existingAppeal && existingAppeal.status === "rejected" ? (
            <>
              <div style={{
                padding: 14, borderRadius: 12, marginBottom: 14,
                background: "var(--danger-soft)", border: "1px solid var(--danger)"
              }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "11px", color: "var(--danger)" }}>❌ Your previous appeal was rejected</p>
                {existingAppeal.reviewNote && (
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--text-2)" }}>Note: {existingAppeal.reviewNote}</p>
                )}
              </div>
              <textarea
                className="modal-textarea" value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your ban should be lifted..." rows={4}
              />
              <div className="modal-btn-row">
                <button className="modal-btn modal-btn--primary" onClick={handleSubmit}>📩 Submit New Appeal</button>
              </div>
            </>
          ) : (
            <>
              <textarea
                className="modal-textarea" value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your ban should be lifted..." rows={4}
              />
              <div className="modal-btn-row">
                <button className="modal-btn modal-btn--primary" onClick={handleSubmit}>📩 Submit Appeal</button>
              </div>
            </>
          )}

          {message && (
            <p className={`modal-status-msg ${message.startsWith("✅") ? "modal-status-msg--success" : "modal-status-msg--error"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
