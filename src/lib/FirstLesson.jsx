import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "./metronome.jsx";
import { playClick, unlockAudio } from "./audio.js";
import { saveSession } from "./session.js";

const DIM = "#8a969c";
const SECS = 60;
const BPM = 80;

export function markFirstLessonDone() {
  saveSession("firstLesson", { done: true });
}

export default function FirstLesson({ onHome, onOpen }) {
  const [phase, setPhase] = useState("intro");
  const [left, setLeft] = useState(SECS);
  const [beat, setBeat] = useState(false);
  const stopRef = useRef(null);

  useEffect(() => () => stopRef.current?.(), []);

  function halt() {
    stopRef.current?.();
    stopRef.current = null;
    setBeat(false);
  }

  function skip() {
    halt();
    markFirstLessonDone();
    onHome?.();
  }

  function finish() {
    halt();
    markFirstLessonDone();
    setPhase("done");
  }

  function start() {
    halt();
    const ctx = unlockAudio();
    let cancelled = false;
    let timer = 0;
    let next = ctx.currentTime + 0.02;
    let n = 0;
    const endAt = ctx.currentTime + SECS;
    setLeft(SECS);
    setPhase("play");

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 80);
      }, delay);
    };

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (now >= endAt) {
        finish();
        return;
      }
      const horizon = Math.min(now + 0.16, endAt);
      const beatSec = 60 / BPM;
      while (next < now - 0.02) {
        next += beatSec;
        n += 1;
      }
      while (next < horizon && !cancelled) {
        playClick(ctx, next, n % 4 === 0);
        pulse(next);
        next += beatSec;
        n += 1;
      }
      setLeft(Math.max(0, Math.ceil(endAt - ctx.currentTime)));
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }

  if (phase === "done") {
    return (
      <div>
        <p style={{ color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, margin: "8px 0 10px" }}>Fertig</p>
        <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: 32, margin: "0 0 10px" }}>Eine Minute gehalten.</h2>
        <p style={{ color: DIM, fontSize: 17, margin: "0 0 18px" }}>
          Als Nächstes: eine einfache Figur mit rechts/links — oder die Hände einzeln sauber wechseln.
        </p>
        <button className="card" style={{ width: "100%", marginBottom: 10 }} onClick={() => onOpen?.("rudiments")}>
          <div className="card-kicker">Als Nächstes</div>
          <div className="card-title" style={{ fontSize: 26 }}>Rudiments</div>
          <div className="card-lead">Kleine Standard-Übungen. Fang mit Nr. 1 an: abwechselnd rechts und links.</div>
        </button>
        <button className="card" style={{ width: "100%", marginBottom: 16 }} onClick={() => onOpen?.("stick")}>
          <div className="card-kicker">Oder</div>
          <div className="card-title" style={{ fontSize: 26 }}>Stick Control</div>
          <div className="card-lead">24 kurze Handwechsel. Tempo bleibt gleich, nur die Folge ändert sich.</div>
        </button>
        <button className="ghost" style={{ width: "100%" }} onClick={() => onHome?.()}>Zurück zur Übersicht</button>
      </div>
    );
  }

  return (
    <div>
      {phase === "intro" ? (
        <>
          <p style={{ color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, margin: "8px 0 10px" }}>Erste Übung</p>
          <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: 30, margin: "0 0 10px" }}>Eine Minute im Puls bleiben</h2>
          <p style={{ color: DIM, fontSize: 17, margin: "0 0 16px" }}>
            Du hörst einen gleichmäßigen Klick — 80 Schläge pro Minute, das ist ein ruhiges Gehtempo. Bei jedem Klick ein Schlag auf dem Pad. Nicht schneller werden.
          </p>
        </>
      ) : (
        <>
          <p style={{ color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, margin: "8px 0 10px" }}>Läuft</p>
          <p style={{ color: DIM, fontSize: 16, margin: "0 0 8px" }}>Bleib am Pad. Jeder Klick = ein Schlag.</p>
        </>
      )}
      <div className="panel dock" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none" }}>
        <div className="dial-row">
          <MetronomeDial bpm={BPM} beat={beat} active={phase === "play"} onToggle={() => (phase === "play" ? finish() : start())} size={170} now subLabel={phase === "play" ? "Stop" : "Start"} />
        </div>
        {phase === "play" ? (
          <div className="count">
            <span className="count-num">{left}</span>
            <span className="count-unit">Sekunden</span>
          </div>
        ) : null}
      </div>
      <button className="ghost" style={{ width: "100%" }} onClick={skip}>Überspringen</button>
    </div>
  );
}
