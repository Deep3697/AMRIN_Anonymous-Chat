import { useEffect, useRef, useState } from "react";
import "./brand-logo.css";

/**
 * TypewriterText — Generic typewriter for titles.
 * Uses Fredoka font (set via CSS on .auth-title).
 */
export function TypewriterText({
  text = "",
  delay = 60,
  startDelay = 600,
  className = "",
  as: Component = "span",
  showCursor = true,
  hideCursorOnDone = false,
  active = true,
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    setDisplayedText("");
    setDone(false);
    indexRef.current = 0;
    let charTimeout = null;

    const startTimer = setTimeout(() => {
      setTyping(true);

      const typeCharacter = () => {
        if (indexRef.current < text.length) {
          const i = indexRef.current;
          indexRef.current++;
          setDisplayedText((prev) => prev + text.charAt(i));

          const randomDelay =
            Math.max(20, Math.floor(Math.random() * 50) + delay - 25);

          charTimeout = setTimeout(typeCharacter, randomDelay);
        } else {
          setTyping(false);
          setDone(true);
        }
      };

      typeCharacter();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (charTimeout) clearTimeout(charTimeout);
    };
  }, [text, delay, startDelay, active]);

  if (!active && !done) return null;

  return (
    <Component className={className}>
      {displayedText}
      {showCursor && (!hideCursorOnDone || !done) && (
        <span className={`brand-title-cursor ${typing ? "typing" : ""}`} />
      )}
    </Component>
  );
}

/**
 * BrandLogo — Types "AMRIN.CHAT" character by character in Nevera font.
 * Calls onComplete() when the full text has been typed out.
 */
function BrandLogo({
  text = "AMRIN.CHAT",
  delay = 150,
  startDelay = 400,
  className = "",
  onComplete,
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayedText("");
    setDone(false);
    indexRef.current = 0;
    let charTimeout = null;

    const startTimer = setTimeout(() => {
      setTyping(true);

      const typeCharacter = () => {
        if (indexRef.current < text.length) {
          const i = indexRef.current;
          indexRef.current++;
          setDisplayedText((prev) => prev + text.charAt(i));

          // Extra pause on "." for dramatic effect
          const currentChar = text.charAt(i);
          let baseDelay = delay;
          if (currentChar === ".") baseDelay = delay + 220;

          const randomDelay =
            Math.max(50, Math.floor(Math.random() * 80) + baseDelay - 40);

          charTimeout = setTimeout(typeCharacter, randomDelay);
        } else {
          setTyping(false);
          setDone(true);
          if (onComplete) onComplete();
        }
      };

      typeCharacter();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (charTimeout) clearTimeout(charTimeout);
    };
  }, [text, delay, startDelay]);

  return (
    <div className={`brand-container ${className}`}>
      <h1 className="brand-text">
        {displayedText}
        {!done && (
          <span className={`cursor ${typing ? "typing" : ""}`} />
        )}
      </h1>
    </div>
  );
}

export { BrandLogo };
export default BrandLogo;
