import { useState } from "react";
import { PLANS, dayKey, pickPlanId, planMinutes } from "./today.js";
import { loadSession, saveSession } from "./session.js";
import { t } from "./i18n.js";

// „Heute“: ein kleiner Übeplan als Vorschlag. Schritte antippen öffnet das Modul mit Startwerten;
// kein Timer, keine Haken – die Minuten sind nur Richtwerte.
export default function Today({ onOpen }) {
  const [planId, setPlanId] = useState(() => pickPlanId(new Date(), loadSession("today", {})));
  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];

  function choose(id) {
    setPlanId(id);
    saveSession("today", { day: dayKey(), plan: id });
  }

  return (
    <section className="card today" aria-labelledby="today-title">
      <div className="today-head">
        <div>
          <div className="card-kicker">{t("Heute")}</div>
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
    </section>
  );
}
