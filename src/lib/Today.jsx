import { useEffect, useState } from "react";
import { PLANS, dayKey, pickPlanId, planMinutes } from "./today.js";
import { TODAY_SKIP_KEY, hideFirstToday, isFirstHidden } from "./firstSkip.js";
import { loadSession, saveSession } from "./session.js";
import { QuestFlag } from "./HomeIcons.jsx";
import { t } from "./i18n.js";

// „Heute“: ein kleiner Übeplan als Vorschlag. Schritte antippen öffnet das Modul mit Startwerten;
// kein Timer, keine Haken – die Minuten sind nur Richtwerte.
// Als „Tagesquest“ gekennzeichnet; „Überspringen“ blendet sie bis Tagesende aus (wie „Nicht heute“ bei der Ersten Übung).
export default function Today({ onOpen }) {
  const [planId, setPlanId] = useState(() => pickPlanId(new Date(), loadSession("today", {})));
  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const [skip, setSkip] = useState(() => loadSession(TODAY_SKIP_KEY, {}));
  const [leaving, setLeaving] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    // nach Mitternacht aus dem Hintergrund zurück: Tag neu prüfen
    const onVis = () => { if (!document.hidden) setTick((n) => n + 1); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function skipToday() {
    if (leaving) return;
    const done = () => {
      const next = hideFirstToday();
      saveSession(TODAY_SKIP_KEY, next);
      setSkip(next);
      setLeaving(false);
      window.requestAnimationFrame(() => document.querySelector(".home .cards .card")?.focus({ preventScroll: true }));
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { done(); return; }
    setLeaving(true);
    window.setTimeout(done, 300);
  }

  if (isFirstHidden(skip)) return null;

  function choose(id) {
    setPlanId(id);
    saveSession("today", { day: dayKey(), plan: id });
  }

  return (
    <div className={leaving ? "first-wrap today-wrap leaving" : "first-wrap today-wrap"}>
    <div className="first-inner">
    <section className="card today quest" aria-labelledby="today-title">
      <div className="today-head">
        <div>
          <div className="card-kicker quest-kicker"><QuestFlag />{t("Tagesquest")}<span className="quest-sep" aria-hidden="true">·</span>{t("Heute")}</div>
          <h2 className="today-title" id="today-title">
            {t(plan.title, null, "today")}
            <span className="today-total">{planMinutes(plan)}{"\u00a0"}{t("Min")}</span>
          </h2>
        </div>
        <div className="seg today-seg" role="group" aria-label={t("Plan wählen")}>
          {PLANS.map((p) => (
            <button key={p.id} type="button" className={p.id === plan.id ? "on" : ""} aria-pressed={p.id === plan.id}
              aria-label={`${t("Plan")} ${p.id}: ${t(p.title, null, "today")}`} onClick={() => choose(p.id)}>{p.id}</button>
          ))}
        </div>
      </div>
      <ol className="today-steps">
        {plan.steps.map((s, i) => (
          <li key={i}>
            <button type="button" className="today-step" onClick={() => onOpen(s.view, s.preset)}>
              <span className="today-min"><b>{s.min}</b>{t("Min")}</span>
              <span className="today-txt">
                <span className="today-label">{t(s.label)}</span>
                <span className="today-detail">{t(s.detail)}</span>
              </span>
              <span className="today-go" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="today-foot">
        <button type="button" className="first-skip" onClick={skipToday} aria-label={t("Tagesquest für heute überspringen")}>{t("Überspringen")}</button>
      </div>
    </section>
    </div>
    </div>
  );
}
