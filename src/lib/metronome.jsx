const TEAL = "#5cc8b8";
const TEAL_GLOW = "rgba(92,200,184,0.45)";

export function MetronomeDial({ bpm, beat, active, onToggle, size = 112, now = true }) {
  const paint = TEAL;
  const large = size >= 72;
  const fill = now
    ? (beat ? "#fff" : paint)
    : (beat ? "rgba(92,200,184,0.32)" : active ? "rgba(92,200,184,0.12)" : "transparent");
  const ring = now
    ? (beat ? "#fff" : paint)
    : (beat ? "#fff" : active ? TEAL : "#2a2a2a");
  const num = now
    ? (beat ? paint : "#000")
    : (beat ? "#fff" : active ? TEAL : "#8a969c");
  const labelCol = now ? (beat ? paint : "#000") : (active || beat ? TEAL : "#8a969c");
  const bpmSize = Math.max(12, Math.round(size * (large ? 0.36 : 0.34)));
  const labelSize = Math.max(8, Math.round(size * 0.11));
  return (
    <button
      type="button"
      onClick={onToggle}
      title={(active ? "Click aus" : "Click an") + " (" + bpm + " BPM)"}
      aria-label={active ? "Metronom stoppen" : "Metronom starten"}
      style={{
        background: fill,
        border: (large ? 3 : 2) + "px solid " + ring,
        borderRadius: "50%",
        width: size,
        height: size,
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: beat
          ? "0 0 24px 7px " + paint
          : now
            ? "0 0 16px 3px " + paint
            : active
              ? "0 0 12px 3px " + TEAL_GLOW
              : "none",
        transform: beat ? "scale(1.07)" : "scale(1)",
        transition: "transform .05s linear, background .05s linear, box-shadow .05s linear, border-color .05s linear",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
        <div style={{
          color: num,
          fontSize: bpmSize,
          fontFamily: "'Space Mono', ui-monospace, monospace",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}>{bpm}</div>
        {large && (
          <div style={{
            color: labelCol,
            fontSize: labelSize,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginTop: 4,
            opacity: 0.85,
          }}>{now ? (active ? "Now" : "BPM") : "BPM"}</div>
        )}
      </div>
    </button>
  );
}
