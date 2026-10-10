import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "./metronome.jsx";
import { playClick, unlockAudio } from "./audio.js";
import { loadSession, saveSession } from "./session.js";
import { getLang, t } from "./i18n.js";
import { pickCheer } from "./cheers.js";
import { BEGINNER_KEY, STEPS, doneSet, markDone, nextIndex, planSeconds, stepIndex, stepMeta, tempoPlan, waveDir, waveLevels } from "./beginner.js";

const DIM = "#8a969c";
const KICK = { color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, margin: "8px 0 10px" };

export function markFirstLessonDone() {
  saveSession("firstLesson", { done: true });
}

// Fortschritt im Einstieg (Schritte 1-5), inkl. alter Speicherung der Ersten Übung.
export function loadBeginnerDone() {
  return doneSet(loadSession(BEGINNER_KEY, {}), !!loadSession("firstLesson", {}).done);
}

function saveStepDone(id) {
  if (id === STEPS[0].id) markFirstLessonDone();
  saveSession(BEGINNER_KEY, markDone({ done: [...loadBeginnerDone()] }, id));
}

// Click nach Plan (BPM pro Schlag) abspielen. Gibt eine Stop-Funktion zurück.
// onPulse(i) zum hörbaren Schlag i, onLeft(Sekunden) laufend, onEnd() am Ende. Auch für die No-Stick-Challenge.
export function runPlan(plan, { onPulse, onLeft, onEnd }) {
  const ctx = unlockAudio();
  let cancelled = false;
  let timer = 0;
  let i = 0;
  let next = ctx.currentTime + 0.05;
  const endAt = next + planSeconds(plan);
  onLeft?.(Math.ceil(endAt - ctx.currentTime));

  const pulse = (when, n) => {
    const delay = Math.max(0, (when - ctx.currentTime) * 1000);
    window.setTimeout(() => { if (!cancelled) onPulse?.(n); }, delay);
  };

  const schedule = () => {
    if (cancelled) return;
    const now = ctx.currentTime;
    if (now >= endAt) {
      cancelled = true;
      onEnd?.();
      return;
    }
    const horizon = now + 0.16;
    while (i < plan.length && next < horizon) {
      playClick(ctx, next, i % 4 === 0);
      pulse(next, i);
      next += 60 / plan[i];
      i += 1;
    }
    onLeft?.(Math.max(0, Math.ceil(endAt - ctx.currentTime)));
    timer = window.setTimeout(schedule, 25);
  };
  schedule();
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

function Progress({ idx, done }) {
  return (
    <div className="bg-progress" aria-hidden="true">
      {STEPS.map((s, i) => <span key={s.id} className={`${done.has(s.id) ? "is-done" : ""}${i === idx ? " is-cur" : ""}`} />)}
    </div>
  );
}

export function Sticking({ step, pos }) {
  const n = step.sticking.length;
  const cur = pos >= 0 ? pos % n : -1;
  return (
    <div className={n > 4 ? "bg-stick is-long" : "bg-stick"} aria-label={`${t("Handfolge")}: ${step.sticking.join(" ")}`}>
      {step.sticking.map((h, i) => (
        <span key={i} className={`bg-hand${h === "L" ? " is-left" : ""}${i === cur ? " is-now" : ""}${step.accent.includes(i) ? " is-acc" : ""}`}>
          {step.accent.includes(i) ? <i aria-hidden="true">&gt;</i> : null}{h}
        </span>
      ))}
    </div>
  );
}

// Tempo-Welle: Verlauf als Linie, Punkt = aktuelle Stufe, darunter Richtung.
function Wave({ step, plan, pos }) {
  const lv = waveLevels(step.wave);
  const per = step.wave.bars * 4;
  const k = pos >= 0 ? Math.min(lv.length - 1, Math.floor(pos / per)) : -1;
  const W = 300, H = 56, lo = step.wave.from, hi = step.wave.to;
  const x = (i) => 8 + (i * (W - 16)) / (lv.length - 1);
  const y = (b) => H - 8 - ((b - lo) * (H - 16)) / (hi - lo);
  const dir = pos >= 0 ? waveDir(plan, pos) : "up";
  const label = dir === "peak" ? t("Höchstes Tempo") : dir === "down" ? t("Langsamer") : t("Schneller");
  return (
    <div className="bg-wave">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden="true">
        <polyline points={lv.map((b, i) => `${x(i)},${y(b)}`).join(" ")} fill="none" stroke="rgba(92,200,184,.45)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {k >= 0 ? <polyline points={lv.slice(0, k + 1).map((b, i) => `${x(i)},${y(b)}`).join(" ")} fill="none" stroke="#5cc8b8" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {k >= 0 ? <circle cx={x(k)} cy={y(lv[k])} r="7" fill="#fff" stroke="#5cc8b8" strokeWidth="3" /> : null}
      </svg>
      <div className={`bg-dir is-${dir}`} role="status" aria-live="polite">
        <span className="bg-arrow" aria-hidden="true">{dir === "peak" ? "●" : dir === "down" ? "▼" : "▲"}</span>
        {pos >= 0 ? `${label} · ${plan[pos]} BPM` : `${lo} → ${hi} → ${lo} BPM`}
      </div>
    </div>
  );
}

// Bonus-Karte „No-Stick-Challenge“ (zählt nicht zum Fortschritt). Unter der Liste „Dein Einstieg“ und nach Schritt 5.
export function NoStickCard({ onOpen, style }) {
  return (
    <button type="button" className="card ns-card" style={{ width: "100%", ...style }} onClick={() => onOpen?.("nostick")}>
      <span className="ns-card-emoji" aria-hidden="true">🥄👟🥢</span>
      <div className="card-kicker">{t("Bonus · ohne Sticks")}</div>
      <div className="card-title" style={{ fontSize: 24 }}>{t("No-Stick-Challenge")}</div>
      <div className="card-lead">{t("Trommel mit allem außer Sticks: Hände, Kochlöffel, Schuhe, Essstäbchen … Drei kurze Runden, jede mit einem neuen Teil.")}</div>
    </button>
  );
}

function StepList({ idx, done, onPick, onOpen }) {
  return (
    <section className="bg-list" aria-labelledby="bg-list-title">
      <h3 id="bg-list-title">{t("Dein Einstieg")}</h3>
      <ol>
        {STEPS.map((s, i) => {
          const m = stepMeta(s);
          return (
            <li key={s.id}>
              <button type="button" className={i === idx ? "bg-item is-cur" : "bg-item"} onClick={() => onPick(i)} aria-current={i === idx ? "step" : undefined}>
                <span className={done.has(s.id) ? "bg-num is-done" : "bg-num"} aria-label={done.has(s.id) ? t("erledigt") : undefined}>{done.has(s.id) ? "✓" : i + 1}</span>
                <span className="bg-item-txt">
                  <b>{t(s.title)}</b>
                  <small>{`${m.bpm} BPM · ${t("{m} Min", { m: m.min })} · ${s.sticking.slice(0, 4).join(" ")}${s.sticking.length > 4 ? " …" : ""}`}</small>
                </span>
                <span className="bg-item-go" aria-hidden="true">›</span>
              </button>
            </li>
          );
        })}
      </ol>
      {onOpen ? <NoStickCard onOpen={onOpen} style={{ marginTop: 12 }} /> : null}
    </section>
  );
}

export default function FirstLesson({ onHome, onOpen, preset }) {
  const [done, setDone] = useState(loadBeginnerDone);
  const [idx, setIdx] = useState(() => {
    const p = preset?.step ? stepIndex(preset.step) : -1;
    if (p >= 0) return p;
    const n = nextIndex(done);
    return n >= 0 ? n : 0;
  });
  const [phase, setPhase] = useState(() => (!preset?.step && nextIndex(done) < 0 ? "list" : "intro"));
  const step = STEPS[idx];
  const plan = tempoPlan(step);
  const [left, setLeft] = useState(0);
  const [pos, setPos] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [cheer, setCheer] = useState(null);
  const lastCheer = useRef(-1);
  const stopRef = useRef(null);

  useEffect(() => () => stopRef.current?.(), []);

  function halt() {
    stopRef.current?.();
    stopRef.current = null;
    setBeat(false);
    setPos(-1);
  }

  function complete() {
    saveStepDone(step.id);
    setDone(loadBeginnerDone());
  }

  function skip() {
    halt();
    complete();
    onHome?.();
  }

  function finish() {
    halt();
    complete();
    const c = pickCheer(getLang(), lastCheer.current);
    lastCheer.current = c.i;
    setCheer(c.text);
    setPhase("done");
    window.scrollTo(0, 0);
  }

  // Stop vor dem Ende: zurück zur Erklärung, zählt nicht als geschafft.
  function stop() {
    halt();
    setPhase("intro");
  }

  function pick(i) {
    halt();
    setIdx(i);
    setPhase("intro");
    window.scrollTo(0, 0);
  }

  function start() {
    halt();
    setPhase("play");
    stopRef.current = runPlan(plan, {
      onPulse: (n) => { setPos(n); setBeat(true); window.setTimeout(() => setBeat(false), 80); },
      onLeft: setLeft,
      onEnd: finish,
    });
  }

  if (phase === "list") {
    return (
      <div>
        <p style={KICK}>{t("Alle Schritte geschafft")}</p>
        <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: 30, margin: "0 0 10px" }}>{t("Einstieg wiederholen")}</h2>
        <p style={{ color: DIM, fontSize: 17, margin: "0 0 6px" }}>{t("Such dir eine Übung aus und spiel sie nochmal - Wiederholen macht dich sicherer.")}</p>
        <StepList idx={-1} done={done} onPick={pick} onOpen={onOpen} />
        <button className="ghost" style={{ width: "100%", marginTop: 14 }} onClick={() => onHome?.()}>{t("Zurück zur Übersicht")}</button>
      </div>
    );
  }

  if (phase === "done") {
    const nxt = STEPS[idx + 1];
    return (
      <div>
        <p style={KICK}>{`${t("Geschafft!")} · ${t("Schritt {n} von {total}", { n: idx + 1, total: STEPS.length })}`}</p>
        <Progress idx={idx} done={done} />
        <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: 32, margin: "0 0 8px" }}>{t(step.done)}</h2>
        <p className="bg-cheer" role="status">{cheer}</p>
        {nxt ? (
          <button className="card bg-next" style={{ width: "100%", marginBottom: 10 }} onClick={() => pick(idx + 1)}>
            <div className="card-kicker">{`${t("Nächste Übung")} · ${t("Schritt {n} von {total}", { n: idx + 2, total: STEPS.length })}`}</div>
            <div className="card-title" style={{ fontSize: 26 }}>{t(nxt.title)}</div>
            <div className="card-lead">{t(nxt.lead)}</div>
            <div className="card-go">Start</div>
          </button>
        ) : (
          <>
            <p style={{ color: DIM, fontSize: 17, margin: "0 0 14px" }}>
              {t("Du hast alle fünf Schritte geschafft. Jetzt bist du bereit für die Rudiments und Hand Control.")}
            </p>
            <button className="card" style={{ width: "100%", marginBottom: 10 }} onClick={() => onOpen?.("rudiments")}>
              <div className="card-kicker">{t("Als Nächstes")}</div>
              <div className="card-title" style={{ fontSize: 26 }}>Rudiments</div>
              <div className="card-lead">{t("Kleine Standard-Übungen. Fang mit Nr. 1 an: abwechselnd rechts und links.")}</div>
            </button>
            <button className="card" style={{ width: "100%", marginBottom: 10 }} onClick={() => onOpen?.("stick")}>
              <div className="card-kicker">{t("Oder")}</div>
              <div className="card-title" style={{ fontSize: 26 }}>{t("Hand Control")}</div>
              <div className="card-lead">{t("24 kurze Handwechsel. Tempo bleibt gleich, nur die Folge ändert sich.")}</div>
            </button>
            <NoStickCard onOpen={onOpen} style={{ marginBottom: 10 }} />
          </>
        )}
        <div className="bg-row">
          <button className="ghost" onClick={() => setPhase("intro")}>{t("Nochmal")}</button>
          <button className="ghost" onClick={() => onHome?.()}>{t("Zurück zur Übersicht")}</button>
        </div>
      </div>
    );
  }

  const meta = stepMeta(step);
  const playing = phase === "play";
  return (
    <div>
      <p style={KICK}>{playing ? t("Läuft") : `${t("Schritt {n} von {total}", { n: idx + 1, total: STEPS.length })} · ${t(step.title)}`}</p>
      <Progress idx={idx} done={done} />
      {playing ? (
        <p style={{ color: DIM, fontSize: 16, margin: "0 0 8px" }}>{t("Bleib am Pad. Jeder Klick = ein Schlag.")}</p>
      ) : (
        <>
          <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: 30, margin: "0 0 10px" }}>{t(step.head)}</h2>
          <p style={{ color: DIM, fontSize: 17, margin: "0 0 12px" }}>{t(step.text)}</p>
          <div className="bg-meta">{`${meta.bpm} BPM · ${t("{m} Min", { m: meta.min })}`}</div>
        </>
      )}
      <Sticking step={step} pos={playing ? pos : -1} />
      {step.wave ? <Wave step={step} plan={plan} pos={playing ? Math.max(0, pos) : -1} /> : null}
      <div className="panel dock" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none", border: "1px solid transparent" }}>
        <div className="dial-row">
          <MetronomeDial bpm={playing && pos >= 0 ? plan[pos] : plan[0]} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={170} now subLabel={playing ? "Stop" : "Start"} />
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
          <button className="ghost" style={{ width: "100%", minHeight: 44, border: "1px solid transparent" }} onClick={skip}>{t("Überspringen")}</button>
          <StepList idx={idx} done={done} onPick={pick} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}
