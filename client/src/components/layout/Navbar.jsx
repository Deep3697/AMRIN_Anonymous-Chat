import { useState } from "react";
import HelpModal from "../help/HelpModal";

export default function Navbar() {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div>
      <button onClick={() => setShowHelp(true)}>?</button>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}