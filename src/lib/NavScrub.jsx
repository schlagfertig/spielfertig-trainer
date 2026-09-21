import { useRef, useState } from "react";

const TEAL = "#5cc8b8";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function eight(preview, label) {
  const raw = String(preview || "").replace(/\s+/g, "");
  if (/^[RL]+$/i.test(raw)) return raw.slice(0, 8).toUpperCase().split("");
  return [];
}

export function NavScrub({ items, index, disabled, onPick }) {
  const list = items || [];
  const idx = clamp(index || 0, 0, Math.max(0, list.length - 1));
  const prev = list[idx - 1];
  const next = list[idx + 1];
  const [hover, setHover] = useState(-1);
  const [wheel, setWheel] = useState(false);
  const touch = useRef(null);

  function go(i) {
    const row = list[i];
    if (!row || disabled) return;
    onPick?.(row.id);
  }

  function previewAt(i) {
    return list[clamp(i, 0, list.length - 1)] || null;
  }

  function onTouchStart(e) {
    if (disabled) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    touch.current = {
      x: t.clientX,
      y: t.clientY,
      start: idx,
      mode: "pending",
      timer: window.setTimeout(() => {
        if (!touch.current || touch.current.mode !== "pending") return;
        touch.current.mode = "wheel";
        setWheel(true);
        setHover(idx);
      }, 320),
    };
  }

  function onTouchMove(e) {
    const st = touch.current;
    const t = e.changedTouches?.[0];
    if (!st || !t) return;
    const dx = t.clientX - st.x;
    const dy = Math.abs(t.clientY - st.y);
    if (st.mode === "pending" && (Math.abs(dx) > 14 || dy > 16)) {
      window.clearTimeout(st.timer);
      st.mode = Math.abs(dx) > dy ? "swipe" : "cancel";
    }
    if (st.mode === "swipe") {
      setHover(clamp(st.start + Math.round(-dx / 42), 0, list.length - 1));
      setWheel(true);
    }
    if (st.mode === "wheel") {
      setHover(clamp(st.start + Math.round(-dx / 28), 0, list.length - 1));
    }
  }

  function onTouchEnd() {
    const st = touch.current;
    touch.current = null;
    if (st) window.clearTimeout(st.timer);
    const pick = hover >= 0 ? hover : idx;
    setWheel(false);
    setHover(-1);
    if (!st || st.mode === "cancel" || st.mode === "pending") return;
    if (pick !== idx) go(pick);
  }

  const shown = previewAt(hover >= 0 ? hover : idx);
  const shownI = hover >= 0 ? hover : idx;
  const letters = shown ? eight(shown.preview, shown.label) : [];

  return (
    <div
      className="rud-nav"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {wheel && shown ? (
        <div style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: "calc(100% + 8px)",
          background: "#14191c",
          border: `1.5px solid ${TEAL}`,
          borderRadius: 14,
          padding: "10px 10px 12px",
          boxShadow: "0 -10px 28px rgba(0,0,0,.45)",
          pointerEvents: "none",
        }}>
          <div style={{ textAlign: "center", color: TEAL, font: "800 13px Figtree, sans-serif", letterSpacing: "0.12em" }}>
            {shown.id}.
          </div>
          {letters.length ? (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 6 }}>
              {letters.map((ch, i) => (
                <span key={i} style={{ font: "700 22px/1 Oswald, sans-serif", color: "#f4f7f6", minWidth: 16, textAlign: "center" }}>{ch}</span>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#f4f7f6", font: "700 20px/1.15 Oswald, sans-serif", marginTop: 4 }}>
              {shown.label}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
            {list.map((row, i) => {
              const d = Math.abs(i - shownI);
              if (d > 4) return null;
              const on = i === shownI;
              return (
                <span key={row.id} style={{
                  minWidth: on ? 36 : 28,
                  height: on ? 36 : 28,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: on ? "800 16px Oswald, sans-serif" : "700 13px Oswald, sans-serif",
                  color: on ? "#06120f" : TEAL,
                  background: on ? TEAL : "#1c2226",
                  border: `1px solid ${TEAL}`,
                  opacity: d === 0 ? 1 : d === 1 ? 0.8 : 0.4,
                }}>{row.id}</span>
              );
            })}
          </div>
        </div>
      ) : null}
      <button type="button" className="rud-half prev" disabled={!prev || disabled} onClick={() => go(idx - 1)}>
        <span className="rud-half-arrow">‹</span>
        <span className="rud-half-name">{prev ? prev.label : ""}</span>
      </button>
      <button type="button" className="rud-half next" disabled={!next || disabled} onClick={() => go(idx + 1)}>
        <span className="rud-half-name">{next ? next.label : ""}</span>
        <span className="rud-half-arrow">›</span>
      </button>
    </div>
  );
}
