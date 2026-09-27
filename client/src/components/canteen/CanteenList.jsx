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
        <div key={c._id} onClick={() => setSelected(c)} style={{ cursor: "pointer", border: "1px solid #ccc", padding: "8px" }}>
          <strong>{c.name}</strong>
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