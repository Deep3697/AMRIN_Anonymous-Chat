import { useState } from "react";
import HelpModal from "../help/HelpModal";
import CanteenList from "../canteen/CanteenList";

export default function Navbar() {
  const [showHelp, setShowHelp] = useState(false);
  const [showCanteen, setShowCanteen] = useState(false);

  return (
    <div>
      <button onClick={() => setShowCanteen(true)}>🍽️</button>
      <button onClick={() => setShowHelp(true)}>?</button>
      {showCanteen && <CanteenList onClose={() => setShowCanteen(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}