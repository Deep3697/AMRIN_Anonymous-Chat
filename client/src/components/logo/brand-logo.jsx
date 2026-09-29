import { useEffect, useState } from "react";
import "./brand-logo.css";
// 1. Import the physical font file directly into JavaScript
import neveraFontUrl from "./nevera.otf"; 

export function TypewriterText({
  text = "",
  delay = 80,
  minDelay = null,
  maxDelay = null,
  startDelay = 0,
  className = "",
  as: Component = "span",
  showCursor = true,
  hideCursorOnDone = false,
  onComplete,
  style = {},
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    setDisplayedText("");
    setTyping(false);
    setDone(false);

    const getTypingDelay = () => {
      if (minDelay === null || maxDelay === null) return Math.max(20, delay);
      return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    };

    let index = 0;
    const typeNextCharacter = () => {
      if (cancelled) return;
      if (index >= text.length) {
        setTyping(false);
        setDone(true);
        onComplete?.();
        return;
      }
      setTyping(true);
      setDisplayedText(text.slice(0, index + 1));
      index += 1;
      timerId = setTimeout(typeNextCharacter, getTypingDelay());
    };

    const startTimer = setTimeout(() => {
      if (cancelled) return;
      if (text.length === 0) {
        setDone(true);
        onComplete?.();
        return;
      }
      typeNextCharacter();
    }, Math.max(0, startDelay));

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (timerId) clearTimeout(timerId);
    };
  }, [text, delay, minDelay, maxDelay, startDelay, onComplete]);

  return (
    <Component className={className} style={style}>
      {displayedText}
      {showCursor && (!hideCursorOnDone || !done) && (
        <span
          className={`brand-title-cursor ${typing ? "typing" : ""}`}
          aria-hidden="true"
        />
      )}
    </Component>
  );
}

function BrandLogo({
  text = "AMRIN CHAT",
  delay = 90,
  minDelay = 55,
  maxDelay = 115,
  startDelay = 150,
  className = "",
  hideCursorOnDone = false,
  onComplete,
}) {

  // 2. Dynamically inject the @font-face rule on component mount
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerHTML = `
      @font-face {
        font-family: 'NeveraDynamic';
        src: url('${neveraFontUrl}') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(styleSheet);
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div className={`brand-container ${className}`}>
      <TypewriterText
        text={text}
        delay={delay}
        minDelay={minDelay}
        maxDelay={maxDelay}
        startDelay={startDelay}
        as="h1"
        className="brand-text"
        showCursor
        hideCursorOnDone={hideCursorOnDone}
        onComplete={onComplete}
        style={{ 
          // 3. Map to the dynamically injected font name
          fontFamily: "'NeveraDynamic', sans-serif", 
          textTransform: "uppercase" 
        }} 
      />
    </div>
  );
}

export { BrandLogo };
export default BrandLogo;