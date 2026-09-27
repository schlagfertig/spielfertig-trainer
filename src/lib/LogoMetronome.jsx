import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "./metronome.jsx";
import { playClick, unlockAudio } from "./audio.js";
import { loadSession } from "./session.js";
import { t } from "./i18n.js";

const clamp = (n) => Math.max(30, Math.min(260, Math.round(n)));

// Easter Egg: Logo antippen = Metronom (gleiches Dial und gleicher Click wie im Click-Trainer)
export function LogoMetronome() {
  const [open, setOpen] = useState(false);
  const [bpm, setBpm] = useState(() => clamp(Number(loadSession("click", {}).startBpm) || 80));
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const boxRef = useRef(null);
  const stopRef = useRef(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
  }

  function start() {
    const ctx = unlockAudio();
    let cancelled = false;
    let timer = 0;
    let next = ctx.currentTime + 0.02;
    let n = 0;
    const schedule = () => {
      if (cancelled) return;
      while (next < ctx.currentTime + 0.16) {
        playClick(ctx, next, n % 4 === 0);
        const delay = Math.max(0, (next - ctx.currentTime) * 1000);
        window.setTimeout(() => {
          if (cancelled) return;
          setBeat(true);
          window.setTimeout(() => setBeat(false), 90);
        }, delay);
        next += 60 / bpmRef.current;
        n += 1;
      }
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
    setPlaying(true);
  }

  function close() {
    stop();
    setOpen(false);
  }

  // Home verlassen = Click aus
  useEffect(() => () => stopRef.current?.(), []);
  // Tippen außerhalb = zurück zum Logo
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) close(); };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const set = (v) => setBpm(clamp(v));
  return (
    <div className={open ? "logo-metro open" : "logo-metro"} ref={boxRef}>
      <img className="logo" src="/logo.svg?v=clear" alt="schlagfertig" role="button" tabIndex={0} aria-label={t("Logo: Metronom öffnen")} onClick={() => setOpen(true)} />
      {open ? (
        <div className="logo-dial">
          <button type="button" className="logo-dial-x" onClick={close} aria-label={t("Metronom schließen")}>×</button>
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => set(bpm - 5)} aria-label={t("5 BPM langsamer")}>−5</button>
            <MetronomeDial bpm={bpm} setBpm={set} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={150} now subLabel={playing ? "Stop" : "Start"} />
            <button type="button" className="nudge-lg" onClick={() => set(bpm + 5)} aria-label={t("5 BPM schneller")}>+5</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
