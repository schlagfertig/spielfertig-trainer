import { useEffect, useRef, useState } from "react";
import { RudimentStaff } from "./staff.jsx";
import { MetronomeDial, Nudge } from "./metronome.jsx";
import { playClick, playOrnament, unlockAudio } from "./audio.js";
import { loadSession, saveSession } from "./session.js";
import { t } from "./i18n.js";
import { BPM, BPM_MAX, BPM_MIN, LENGTHS, LEVELS, METERS, barOf, etudeEvents, rerollBar, rollEtude } from "./etudeDice.js";

// Etüden-Würfel (Labs, nur für Tom sichtbar): Länge + Schwierigkeit wählen, würfeln, Takt für Takt neu würfeln, üben.
const DIM = "#8a969c";
const KICK = { color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, margin: "8px 0 10px" };

function Seg({ value, options, onChange, label }) {
  return (
    <div className="ed-row">
      <span className="ed-lab">{label}</span>
      <div className="seg ed-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export default function EtudeDice() {
  const saved = loadSession("etudeDice", {});
  const [bars, setBars] = useState(saved.bars === 8 ? 8 : 4);
  const [level, setLevel] = useState(LEVELS.some((l) => l.id === saved.level) ? saved.level : "leicht");
  const [meter, setMeter] = useState(METERS.includes(saved.meter) ? saved.meter : "4/4");
  const [etude, setEtude] = useState(saved.etude?.ids?.length ? saved.etude : null);
  const [bpm, setBpm] = useState(saved.bpm || BPM.leicht);
  const [click, setClick] = useState(saved.click !== false);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [rolled, setRolled] = useState(-2); // -1 = alles, sonst Taktnummer (kurze Würfel-Animation)
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const stopRef = useRef(null);

  useEffect(() => { saveSession("etudeDice", { bars, level, meter, etude, bpm, click }); }, [bars, level, meter, etude, bpm, click]);
  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setPlayT(-1);
    setBeat(false);
  }

  function flash(i) {
    setRolled(i);
    window.setTimeout(() => setRolled(-2), 340);
  }

  function roll() {
    stop();
    setEtude(rollEtude({ bars, level, meter }));
    setBpm(BPM[level]);
    flash(-1);
  }

  function reroll(i) {
    stop();
    setEtude((e) => rerollBar(e, i));
    flash(i);
  }

  function start() {
    if (!etude) return;
    stop();
    const ctx = unlockAudio();
    const { ev, total } = etudeEvents(etude, { click, snare: true });
    const stepSec = () => 60 / Math.max(30, bpmRef.current) / 4;
    let cancelled = false;
    let timer = 0;
    let i = 0;
    let cycle = ctx.currentTime + 0.05;
    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      const horizon = now + 0.16;
      while (!cancelled) {
        const e = ev[i];
        const when = cycle + e.t * stepSec();
        if (when >= horizon) break;
        if (when >= now - 0.02) {
          if (e.kind === "click") {
            playClick(ctx, when, e.down);
            const d = Math.max(0, (when - now) * 1000);
            window.setTimeout(() => { if (cancelled) return; setBeat(true); window.setTimeout(() => setBeat(false), 80); }, d);
          } else playOrnament(ctx, e.nt, when, "snare", stepSec());
          const d = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(e.t); }, d);
        }
        i += 1;
        if (i >= ev.length) { i = 0; cycle += total * stepSec(); }
      }
      timer = window.setTimeout(schedule, 25);
    };
    setPlaying(true);
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
  }

  const steps = etude?.meter === "6/8" ? 12 : 16;
  const curBar = playT < 0 ? -1 : Math.floor((playT + 1e-4) / steps);
  const setupChanged = etude && (etude.bars !== bars || etude.level !== level || etude.meter !== meter);

  return (
    <div className="ed-wrap">
      <p style={KICK}>{`Labs · ${t("Etüden-Würfel")}`}</p>
      <p style={{ color: DIM, fontSize: 17, margin: "0 0 12px" }}>{t("Würfel dir aus den 40 Rudiments deine eigene Etüde - jedes Mal neu, Takt für Takt.")}</p>
      <div className="panel ed-setup">
        <Seg label={t("Länge")} value={bars} onChange={setBars} options={LENGTHS.map((n) => ({ id: n, label: t("{n} Takte", { n }) }))} />
        <Seg label={t("Stufe")} value={level} onChange={setLevel} options={LEVELS.map((l) => ({ id: l.id, label: t(l.label) }))} />
        <Seg label={t("Takt")} value={meter} onChange={setMeter} options={METERS.map((m) => ({ id: m, label: m }))} />
        <button type="button" className="card ed-roll" onClick={roll}>
          <span className="ed-die" aria-hidden="true">🎲</span>
          <span>{etude ? (setupChanged ? t("Neu würfeln") : t("Nochmal würfeln")) : t("Würfeln")}</span>
        </button>
      </div>
      {etude ? (
        <>
          <div className="bg-meta" style={{ margin: "14px 0 8px" }}>{`${t("{n} Takte", { n: etude.ids.length })} · ${t(LEVELS.find((l) => l.id === etude.level)?.label || "")} · ${etude.meter}`}</div>
          <ol className="ed-bars">
            {etude.ids.map((id, i) => {
              const bar = barOf(id, etude.meter);
              const now = curBar === i;
              return (
                <li key={`${i}-${id}`} className={`ed-bar${now ? " is-now" : ""}${rolled === i || rolled === -1 ? " is-roll" : ""}`}>
                  <div className="ed-bar-head">
                    <span className="ed-num">{i + 1}</span>
                    <span className="ed-name">{bar.label.replace(/^\d+\.\s*/, "")}{bar.reps > 1 ? <small> ×{bar.reps}</small> : null}</span>
                    <button type="button" className="ghost ed-reroll" onClick={() => reroll(i)} aria-label={t("Takt {n} neu würfeln", { n: i + 1 })}>🎲</button>
                  </div>
                  <div className="ed-staff">
                    <RudimentStaff rud={bar} playingT={now ? playT - i * steps : -1} />
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="panel dock" style={{ position: "static", margin: "6px 0 14px", borderRadius: 12, boxShadow: "none", border: "1px solid transparent" }}>
            <div className="ed-row" style={{ justifyContent: "center" }}>
              <div className="seg ed-seg" role="radiogroup" aria-label={t("Klang")}>
                <button type="button" role="radio" aria-checked={click} className={click ? "on" : ""} onClick={() => { setClick(true); if (playing) stop(); }}>{t("Snare + Click")}</button>
                <button type="button" role="radio" aria-checked={!click} className={!click ? "on" : ""} onClick={() => { setClick(false); if (playing) stop(); }}>{t("Nur Snare")}</button>
              </div>
            </div>
            <div className="dial-row">
              <Nudge by={-5} bpm={bpm} set={setBpm} min={BPM_MIN} max={BPM_MAX} />
              <MetronomeDial bpm={bpm} setBpm={setBpm} min={BPM_MIN} max={BPM_MAX} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={150} now subLabel={playing ? "Stop" : "Start"} />
              <Nudge by={5} bpm={bpm} set={setBpm} min={BPM_MIN} max={BPM_MAX} />
            </div>
          </div>
          <p style={{ color: DIM, fontSize: 15, margin: "0 0 12px", textAlign: "center" }}>{t("Erst langsam, dann am SpinDial schneller drehen. Ein Takt gefällt dir nicht? Tipp auf 🎲.")}</p>
        </>
      ) : (
        <p style={{ color: DIM, fontSize: 15, margin: "14px 0", textAlign: "center" }}>{t("Wähl Länge und Stufe und tipp auf ‚Würfeln‘.")}</p>
      )}
    </div>
  );
}
