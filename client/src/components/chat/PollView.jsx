import socket from "../../socket/socketClient";
import { useAuthStore } from "../../store/authStore";

export default function PollView({ message }) {
  const user = useAuthStore((s) => s.user);
  const myId = user?._id || user?.sub;
  const totalVotes = message.poll.options.reduce((sum, o) => sum + o.votes.length, 0);

  function vote(optionIndex) {
    socket.emit("poll:vote", { messageId: message._id, optionIndex });
  }

  return (
    <div>
      <p style={{ margin: "0 0 8px", fontWeight: "bold" }}>📊 {message.poll.question}</p>
      {message.poll.options.map((opt, i) => {
        const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
        const votedByMe = opt.votes.some((v) => String(v) === String(myId) || String(v?._id) === String(myId));
        return (
          <div key={i} onClick={() => vote(i)} style={{
            cursor: "pointer", padding: "8px", marginBottom: "6px", borderRadius: "6px",
            border: votedByMe ? "2px solid #007bff" : "1px solid #ddd",
            background: `linear-gradient(90deg, #e7f1ff ${pct}%, transparent ${pct}%)`,
          }}>
            {opt.text} — {opt.votes.length} vote{opt.votes.length !== 1 ? "s" : ""} ({pct}%)
          </div>
        );
      })}
    </div>
  );
}