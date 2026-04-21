import { useEffect, useState } from "react";

const FIREFLY_COUNT = 15;

const fireflies = Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
  left: `${5 + Math.random() * 90}%`,
  top: `${10 + Math.random() * 80}%`,
  delay: `${(Math.random() * 4).toFixed(2)}s`,
  twinkleDelay: `${(Math.random() * 2).toFixed(2)}s`,
  driftDuration: `${(7 + Math.random() * 5).toFixed(2)}s`,
  twinkleDuration: `${(1.8 + Math.random() * 1.4).toFixed(2)}s`,
  key: i,
}));

export default function Intro({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setShow(false);
      onDone?.();
    }, 5000);
    return () => window.clearTimeout(t);
  }, [onDone]);

  if (!show) return null;

  return (
    <div className="intro-overlay" aria-hidden>
      <div className="fireflies">
        {fireflies.map((f) => (
          <span
            key={f.key}
            className="firefly"
            style={{
              left: f.left,
              top: f.top,
              animationDelay: `${f.delay}, ${f.twinkleDelay}`,
              animationDuration: `${f.driftDuration}, ${f.twinkleDuration}`,
            }}
          />
        ))}
      </div>
      <div className="intro-logo">
        <span className="w">GEA</span>
        <span className="o">R</span>
      </div>
      <div className="intro-sub">
        <span className="by">by </span>
        <span className="w">TEAM</span>
        <span className="o">BATTLE</span>
      </div>
      <div className="intro-line" />
      <div className="intro-tagline">Udstyrsdatabase &middot; alle aktiviteter</div>
    </div>
  );
}
