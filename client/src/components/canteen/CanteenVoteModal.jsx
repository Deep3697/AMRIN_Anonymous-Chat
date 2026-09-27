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
    <div>
      <h3>{canteen.name}</h3>
      <button onClick={() => vote(1)}>Low</button>
      <button onClick={() => vote(2)}>Moderate</button>
      <button onClick={() => vote(3)}>Overcrowded</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}