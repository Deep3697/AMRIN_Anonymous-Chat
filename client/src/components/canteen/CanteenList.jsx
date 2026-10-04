import { useEffect, useState } from "react";
import { fetchCanteens } from "../../api/canteen.api";
import CanteenVoteModal from "./CanteenVoteModal";

const LEVEL_LABELS = {
  1: "Low — Few people",
  2: "Moderate — Normal",
  3: "Overcrowded — Packed!",
  null: "Not enough data",
};

const LEVEL_ICONS = {
  1: "🟢",
  2: "🟡",
  3: "🔴",
  null: "⚪",
};

export default function CanteenList({ onClose }) {
  const [canteens, setCanteens] = useState([]);
  const [selected, setSelected] = useState(null);

  function loadCanteens() {
    fetchCanteens()
      .then((res) => setCanteens(res.data.canteens))
      .catch((err) => console.error("Failed to fetch canteens:", err));
  }

  useEffect(() => {
    loadCanteens();
  }, []);

  return (
    <div className="canteen-list">
      <div className="canteen-title">
        🍽️ <span>Canteen Status</span>
      </div>

      {canteens.length === 0 ? (
        <div style={{ color: "var(--text-3)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
          No canteens available
        </div>
      ) : (
        canteens.map((c) => (
          <div
            key={c._id}
            className={`canteen-item${c.hasVoted ? " canteen-item--voted" : ""}`}
            onClick={() => !c.hasVoted && setSelected(c)}
          >
            <div className="canteen-item-name">
              {c.name}
              {c.hasVoted && (
                <span className="canteen-item-voted">✔ Voted this hour</span>
              )}
            </div>
            <div className="canteen-item-info">
              {LEVEL_ICONS[c.currentLevel]} Now: {LEVEL_LABELS[c.currentLevel]}{" "}
              ({c.currentVoteCount} vote{c.currentVoteCount !== 1 ? "s" : ""})
              <br />
              ⏱ Last hour: {LEVEL_LABELS[c.previousLevel]}
            </div>
          </div>
        ))
      )}

      <button className="modal-btn canteen-close-btn" onClick={onClose}>
        Close
      </button>

      {selected && (
        <CanteenVoteModal
          canteen={selected}
          onClose={() => setSelected(null)}
          onVoted={loadCanteens}
        />
      )}
    </div>
  );
}