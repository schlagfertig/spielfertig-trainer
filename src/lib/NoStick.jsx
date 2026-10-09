import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "./metronome.jsx";
import { getLang, t } from "./i18n.js";
import { pickCheer } from "./cheers.js";
import { planSeconds, tempoPlan } from "./beginner.js";
import { runPlan, Sticking } from "./FirstLesson.jsx";
import { BPM_MAX, BPM_MIN, newChallenge, objectOf, reroll, setRoundBpm } from "./noStick.js";

// No-Stick-Challenge: drei kurze Runden mit Haushalts-„Instrumenten“. Bonus, zählt nicht zum Einstieg-Fortschritt.
const DIM = "#8a969c";
const KICK = { color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, margin: "8px 0 10px" };

function Dots({ ri, total, phase }) {
  return (
    <div className="bg-progress" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`${i < ri || phase === "done" ? "is-done" : ""}${i === ri && phase !== "done" ? " is-cur" : ""}`} />
      ))}
    </div>
  );
}

export default function NoStick({ onHome, onOpen }) {
  const [rounds, setRounds] = useState(() => newChallenge());
  const [ri, setRi] = useState(0);
  const [phase, setPhase] = useState("intro");
  const [pos, setPos] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [left, setLeft] = useState(0);
  const [yay, setYay] = useState(null);
  const [cheer, setCheer] = useState(null);
  const [rolling, setRolling] = useState(false);
  const lastCheer = useRef(-1);
  const stopRef = useRef(null);
  const round = rounds[ri];
  const obj = objectOf(round);
  const plan = tempoPlan(round);
  const total = rounds.length;

  useEffect(() => () => stopRef.current?.(), []);

  function halt() {
    stopRef.current?.();
    stopRef.current = null;
    setBeat(false);
    setPos(-1);
  }

  function roundDone() {
    halt();
    if (ri + 1 < total) {
      setYay(`${obj.emoji} ${t(obj.yay)}`);
      setRi(ri + 1);
      setPhase("intro");
    } else {
      const c = pickCheer(getLang(), lastCheer.current);
      lastCheer.current = c.i;
      setCheer(c.text);
      setPhase("done");
    }
    window.scrollTo(0, 0);
  }

  function start() {
    halt();
    setPhase("play");
    stopRef.current = runPlan(plan, {
      onPulse: (n) => { setPos(n); setBeat(true); window.setTimeout(() => setBeat(false), 80); },
      onLeft: setLeft,
      onEnd: roundDone,
    });
  }

  // Stop vor dem Ende: Runde bleibt offen, Erklärung wieder zeigen.
  function stop() {
    halt();
    setPhase("intro");
  }

  function roll() {
    setRounds((r) => reroll(r, ri));
    setRolling(true);
    window.setTimeout(() => setRolling(false), 320);
  }

  function again() {
    halt();
    setRounds(newChallenge());
    setRi(0);
    setYay(null);
    setPhase("intro");
    window.scrollTo(0, 0);
  }

  if (phase === "done") {
    return (
      <div>
        <p style={KICK}>{`${t("Geschafft!")} · ${t("No-Stick-Challenge")}`}</p>
        <Dots ri={ri} total={total} phase={phase} />
        <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: 32, margin: "0 0 8px" }}>{t("Ganz ohne Sticks gegroovt!")}</h2>
        <p className="bg-cheer" role="status">{cheer}</p>
        <ul className="ns-recap">
          {rounds.map((r) => {
            const o = objectOf(r);
            return (
              <li key={r.id}>
                <span className="ns-recap-emoji" aria-hidden="true">{o.emoji}</span>
                <span><b>{t(o.name)}</b><small>{`${t(r.title)} · ${r.bpm} BPM`}</small></span>
                <span className="ns-recap-ok" aria-label={t("erledigt")}>✓</span>
              </li>
            );
          })}
        </ul>
        <p style={{ color: DIM, fontSize: 17, margin: "0 0 14px" }}>{t("Groove steckt nicht in den Sticks, sondern in dir. Schnapp dir neue Sachen und spiel noch eine Runde!")}</p>
        <button className="card bg-next" style={{ width: "100%", marginBottom: 10 }} onClick={again}>
          <div className="card-kicker">{t("Nochmal")}</div>
          <div className="card-title" style={{ fontSize: 26 }}>{t("Neue Challenge")}</div>
          <div className="card-lead">{t("Drei neue Teile, gleiche Muster – mal sehen, was diesmal groovt.")}</div>
          <div className="card-go">Start</div>
        </button>
        <div className="bg-row">
          <button className="ghost" onClick={() => onOpen?.("first")}>{t("Zum Einstieg")}</button>
          <button className="ghost" onClick={() => onHome?.()}>{t("Zurück zur Übersicht")}</button>
        </div>
      </div>
    );
  }

  const playing = phase === "play";
  const sec = Math.round(planSeconds(plan));
  return (
    <div>
      <p style={KICK}>{`${playing ? t("Läuft") : "Bonus"} · ${t("Runde {n} von {total}", { n: ri + 1, total })}`}</p>
      <Dots ri={ri} total={total} phase={phase} />
      {playing ? null : yay ? (
        <p className="bg-cheer ns-yay" role="status">{`${t("Runde {n} geschafft!", { n: ri })} ${yay}`}</p>
      ) : (
        <p style={{ color: DIM, fontSize: 17, margin: "0 0 12px" }}>{t("Alles erlaubt – außer Sticks! Schnapp dir, was gerade herumliegt, und spiel zum Click.")}</p>
      )}
      <div className={`ns-obj${playing ? " is-play" : ""}${rolling ? " is-roll" : ""}`}>
        <span className="ns-emoji" aria-hidden="true">{obj.emoji}</span>
        <div className="ns-obj-txt">
          <h2>{t(obj.name)}</h2>
          {playing ? null : <p>{t(obj.tip)}</p>}
        </div>
        {playing ? null : (
          <button type="button" className="ghost ns-roll" onClick={roll}>
            <span aria-hidden="true">🎲</span> {t("Neu würfeln")}
          </button>
        )}
      </div>
      {playing ? (
        <p style={{ color: DIM, fontSize: 16, margin: "0 0 8px" }}>{t("Jeder Klick = ein Schlag. Bleib locker!")}</p>
      ) : (
        <div className="bg-meta">{`${t(round.title)} · ${round.bpm} BPM · ${t("{s} Sek", { s: sec })}`}</div>
      )}
      <Sticking step={round} pos={playing ? pos : -1} />
      {/* SpinDial: setBpm bleibt immer gesetzt (Tipp = Start/Stop über Pointer-Events); während der Runde ändert Drehen nichts. */}
      <div className="panel dock" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none", border: "1px solid transparent" }}>
        <div className="dial-row">
          <MetronomeDial
            bpm={round.bpm}
            setBpm={(b) => { if (!playing) setRounds((r) => setRoundBpm(r, ri, typeof b === "function" ? b(round.bpm) : b)); }}
            min={BPM_MIN}
            max={BPM_MAX}
            beat={beat}
            active={playing}
            onToggle={() => (playing ? stop() : start())}
            size={170}
            now
            subLabel={playing ? "Stop" : "Start"}
          />
        </div>
        {playing ? (
          <div className="count">
            <span className="count-num">{left}</span>
            <span className="count-unit">{t("Sekunden")}</span>
          </div>
        ) : null}
      </div>
      {playing ? null : (
        <>
          <p style={{ color: DIM, fontSize: 15, margin: "0 0 12px", textAlign: "center" }}>{t("Zu schnell? Dreh am SpinDial – 50 bis 100 BPM.")}</p>
          <button className="ghost" style={{ width: "100%", minHeight: 44 }} onClick={() => onOpen?.("first")}>{t("Zum Einstieg")}</button>
        </>
      )}
    </div>
  );
}
