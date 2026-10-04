import React, { useEffect, useState, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";

export function MagnetizeButton({
  onClick,
  className = "",
  particleCount = 10,
  children,
}) {
  const [isAttracting, setIsAttracting] = useState(false);
  const [particles, setParticles] = useState([]);
  const particlesControl = useAnimation();

  useEffect(() => {
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * (typeof window !== "undefined" ? window.innerWidth + 100 : 2500),
      y: -Math.random() * 1000 + Math.random() * 150,
      tx: (Math.random() - 0.5) * 140, // Target cluster X
      ty: (Math.random() - 0.5) * 40,  // Target cluster Y
    }));
    setParticles(newParticles);
  }, [particleCount]);

  const handleInteractionStart = useCallback(async () => {
    setIsAttracting(true);
    await particlesControl.start((i) => ({
      x: particles[i]?.tx || 0,
      y: particles[i]?.ty || 0,
      scale: 1 + Math.random(),
      transition: {
        type: "spring",
        stiffness: 40 + Math.random() * 40,
        damping: 8 + Math.random() * 4,
      },
    }));
  }, [particlesControl, particles]);

  const handleInteractionEnd = useCallback(async () => {
    setIsAttracting(false);
    await particlesControl.start((i) => ({
      x: particles[i]?.x || 0,
      y: particles[i]?.y || 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 60,
        damping: 14,
      },
    }));
  }, [particlesControl, particles]);

  return (
    <button
      className={`primary magnetic ${className}`}
      onClick={onClick}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      type="button"
    >
      <span className="btn-bg-shine" />
      {particles.map((_, index) => (
        <motion.div
          key={index}
          custom={index}
          initial={{ x: particles[index]?.x || 0, y: particles[index]?.y || 0 }}
          animate={particlesControl}
          className="magnet-particle"
          style={{ opacity: isAttracting ? 0.25 : 0.8 }}
        />
      ))}
      <span className="btn-content">
        {children}
      </span>
    </button>
  );
}
