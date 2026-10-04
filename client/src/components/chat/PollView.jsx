import socket from "../../socket/socketClient";
import { useAuthStore } from "../../store/authStore";

export default function PollView({ message }) {
  const user = useAuthStore((s) => s.user);
  const myId = user?.id || user?._id || user?.sub;
  const totalVotes = message.poll.options.reduce((sum, o) => sum + o.votes.length, 0);

  function vote(optionIndex) {
    socket.emit("poll:vote", { messageId: message._id, optionIndex });
  }

  return (
    <div className="poll-card">
      <div className="poll-question">📊 {message.poll.question}</div>
      {message.poll.options.map((opt, i) => {
        const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
        const votedByMe = opt.votes.some((v) => String(v) === String(myId) || String(v?._id) === String(myId));
        return (
          <div
            key={i}
            className={`poll-option ${votedByMe ? "poll-option--voted" : ""}`}
            onClick={() => vote(i)}
          >
            <div className="poll-option-fill" style={{ width: `${pct}%` }} />
            <div className="poll-option-content">
              <span className="poll-option-text">{opt.text}</span>
              <span className="poll-option-stats">
                {opt.votes.length} vote{opt.votes.length !== 1 ? "s" : ""} ({pct}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}