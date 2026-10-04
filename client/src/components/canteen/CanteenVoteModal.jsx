import { submitCanteenVote } from "../../api/canteen.api";

export default function CanteenVoteModal({ canteen, onClose, onVoted }) {
  async function vote(level) {
    try {
      await submitCanteenVote(canteen._id, level);
      onVoted();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to vote");
    }
  }

  return (
    <div className="canteen-vote-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div className="canteen-vote-card" onClick={(e) => e.stopPropagation()}>
        <div className="canteen-vote-title">🍔 {canteen.name}</div>
        <p className="modal-subtitle" style={{ textAlign: "center", marginBottom: 14 }}>
          How crowded is it right now?
        </p>
        <div className="canteen-vote-options">
          <button className="canteen-vote-btn canteen-vote-btn--low" onClick={() => vote(1)}>
            🟢 Low — Few people
          </button>
          <button className="canteen-vote-btn canteen-vote-btn--moderate" onClick={() => vote(2)}>
            🟡 Moderate — Normal
          </button>
          <button className="canteen-vote-btn canteen-vote-btn--overcrowded" onClick={() => vote(3)}>
            🔴 Overcrowded — Packed!
          </button>
        </div>
        <button className="modal-btn" style={{ width: "100%" }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}