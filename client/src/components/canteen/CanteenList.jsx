import { useEffect, useState } from "react";
import { fetchCanteens } from "../../api/canteen.api";
import CanteenVoteModal from "./CanteenVoteModal";

const LEVEL_LABELS = { 1: "Low", 2: "Moderate", 3: "Overcrowded", null: "Not enough data" };

export default function CanteenList({ onClose }) {
  const [canteens, setCanteens] = useState([]);
  const [selected, setSelected] = useState(null);

  function loadCanteens() {
    fetchCanteens().then((res) => setCanteens(res.data.canteens));
  }

  useEffect(() => { loadCanteens(); }, []);

  return (
    <div>
      <h2>Canteen Status</h2>
      {canteens.map((c) => (
        <div 
          key={c._id} 
          onClick={() => !c.hasVoted && setSelected(c)} 
          style={{ 
            cursor: c.hasVoted ? "not-allowed" : "pointer", 
            border: "1px solid #ccc", 
            padding: "8px",
            opacity: c.hasVoted ? 0.6 : 1,
            backgroundColor: c.hasVoted ? "#f9f9f9" : "white"
          }}
        >
          <strong>{c.name}</strong> {c.hasVoted && <span style={{ color: "green", fontSize: "0.8em" }}> (You voted this hour)</span>}
          <p>Now: {LEVEL_LABELS[c.currentLevel]} ({c.currentVoteCount} votes)</p>
          <p>Last hour: {LEVEL_LABELS[c.previousLevel]}</p>
        </div>
      ))}
      <button onClick={onClose}>Close</button>
      {selected && (
        <CanteenVoteModal canteen={selected} onClose={() => setSelected(null)} onVoted={loadCanteens} />
      )}
    </div>
  );
}