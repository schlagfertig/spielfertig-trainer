import { useEffect, useRef, useState } from "react";
import { loadSession, saveSession } from "./session.js";
import { getLang, t } from "./i18n.js";
import { SLOTS, bumpBpm, createSession, dayKey, endSession, groupByDay, markToasted, minutes, monthKey, monthStats, needsToast, normalizeLog, record, removeEntry, restoreEntry, shiftMonth, weekStats } from "./practiceLog.js";

// Übe-Tagebuch: speichert lokal (sf.v1.diary), Schalter in sf.v1.diaryPrefs (Standard: an).
const LOG_KEY = "diary";
const PREF_KEY = "diaryPrefs";
const TOAST_EVENT = "sf-diary-toast";

export const EX_TITLE = { rudiments: "Rudiments", click: "Click-Trainer", pyramid: "Rhythmuspyramide", stick: "Hand Control", dice: "Etüden-Würfel" };

export function loadLog() { return normalizeLog(loadSession(LOG_KEY, { entries: [] })); }
export function saveLog(log) { saveSession(LOG_KEY, log); }
export function diaryOn() { return loadSession(PREF_KEY, { on: true }).on !== false; }
export function setDiaryOn(on) { saveSession(PREF_KEY, { on: !!on }); }
const tracking = () => diaryOn();

// Anzeigename: Rudiment-Name bzw. „Hand Control · Nr. 3“, sonst der Modulname.
export function entryName(e) {
  const title = t(EX_TITLE[e.ex] || e.ex);
  if (e.ex === "rudiments" && e.label) return e.label;
  if (e.ex === "stick" && e.item != null) return `${title} · ${t("Nr. {n}", { n: e.item })}`;
  return title;
}

export function toastText(e) {
  return t("Eingetragen! 🥁 {name} · {min} min · {bpm} BPM", { name: entryName(e), min: minutes(e.sec), bpm: e.bpm });
}

// Misst Start → Stop eines Übe-Moduls. Wechselt die Übung während des Spielens (z. B. Hand Control „Auto-Weiter“),
// wird der bisherige Teil still eingetragen; der Hinweis kommt erst nach Stop.
export function usePracticeTrack({ ex, item = null, label = "", playing, bpm }) {
  const sess = useRef(null);
  const pending = useRef(null); // id des Eintrags, der nach Stop gemeldet werden soll
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (playing && sess.current) sess.current = bumpBpm(sess.current, bpm);
  }, [bpm, playing]);

  useEffect(() => {
    if (!playing || !tracking()) return undefined;
    sess.current = createSession(ex, item, label, bpm, Date.now());
    return () => {
      const seg = endSession(sess.current, Date.now());
      sess.current = null;
      if (!seg || !tracking()) return;
      let { log, entry } = record(loadLog(), seg);
      if (entry) { saveLog(log); if (needsToast(log, entry.id)) pending.current = entry.id; }
      const stopped = !playingRef.current || !alive.current;
      if (!stopped || !pending.current) return;
      const id = pending.current;
      pending.current = null;
      log = loadLog();
      const e = log.entries.find((x) => x.id === id);
      if (!e || e.toast) return;
      saveLog(markToasted(log, id));
      // Nach dem Stop kurz warten - kein Hinweis mitten in der letzten Bewegung.
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { text: toastText(e) } })), 250);
    };
    // label/bpm absichtlich nicht als Abhängigkeit: ändern die Session nicht
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, ex, item]);
}

// Kleiner Glas-Hinweis oben (nie über dem SpinDial), verschwindet nach 2,6 s.
export function DiaryToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let timer = 0;
    const on = (e) => {
      window.clearTimeout(timer);
      setMsg({ text: e.detail?.text || "", k: Date.now() });
      timer = window.setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => { window.removeEventListener(TOAST_EVENT, on); window.clearTimeout(timer); };
  }, []);
  if (!msg) return null;
  return <div key={msg.k} className="dy-toast" role="status" aria-live="polite">{msg.text}</div>;
}

function dayLabel(day) {
  const today = dayKey();
  const yest = dayKey(Date.now() - 86400000);
  if (day === today) return t("Heute");
  if (day === yest) return t("Gestern");
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  try {
    return dt.toLocaleDateString(getLang() === "en" ? "en-GB" : "de-DE", { weekday: "long", day: "numeric", month: "long" });
  } catch { return day; }
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  try { return new Date(y, m - 1, 1).toLocaleDateString(getLang() === "en" ? "en-GB" : "de-DE", { month: "long", year: "numeric" }); } catch { return key; }
}
function monthName(key) {
  const [y, m] = key.split("-").map(Number);
  try { return new Date(y, m - 1, 1).toLocaleDateString(getLang() === "en" ? "en-GB" : "de-DE", { month: "long" }); } catch { return key; }
}
const SLOT_SHORT = { frueh: "5", vormittag: "8", mittag: "11", nachmittag: "14", abend: "18", nacht: "22" };

// Monatsauswertung: Monat wählen, Summe + Vergleich, Lieblingszeit, Top 3.
function MonthReport({ log }) {
  const now = monthKey();
  const [month, setMonth] = useState(now);
  const m = monthStats(log, month);
  const prevName = monthName(m.prev);
  const diffMin = Math.round(m.diffSec / 60);
  const up = m.diffSec > 0;
  const down = m.diffSec < 0;
  let compare;
  if (!m.sec && !m.prevSec) compare = t("Noch kein Eintrag in diesem Monat - jeder Monat ist ein guter Start!");
  else if (!m.sec) compare = t("In diesem Monat noch nichts eingetragen - leg los und hol dir die erste Minute!");
  else if (!m.prevSec && !m.earlier) compare = t("Dein erster Übemonat im Tagebuch - stark angefangen!");
  else if (!m.prevSec) compare = t("Im {month} war Pause - schön, dass du wieder dabei bist!", { month: prevName });
  else if (up) compare = t("mehr als im {month} - weiter so!", { month: prevName });
  else if (down) compare = t("weniger als im {month} - hol's dir zurück!", { month: prevName });
  else compare = t("genauso viel wie im {month} - schön konstant!", { month: prevName });
  const slot = SLOTS.find((x) => x.id === m.slot);
  const maxSlot = Math.max(1, ...SLOTS.map((x) => m.slots[x.id] || 0));
  const maxTop = Math.max(1, m.top[0]?.sec || 0);
  return (
    <section className="dy-glass dy-month" aria-label={t("Monatsauswertung")}>
      <div className="dy-month-head">
        <button type="button" className="dy-mnav" onClick={() => setMonth(shiftMonth(month, -1))} aria-label={t("Vorheriger Monat")}>‹</button>
        <div className="dy-month-title"><small>{t("Monatsauswertung")}</small><b>{monthLabel(month)}</b></div>
        <button type="button" className="dy-mnav" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= now} aria-label={t("Nächster Monat")}>›</button>
      </div>
      <div className="dy-total">
        <b>{Math.round(m.sec / 60)}</b><span>{t("min geübt")}</span>
        {m.sec ? <small>{t(m.days === 1 ? "an {n} Tag" : "an {n} Tagen", { n: m.days })}</small> : null}
      </div>
      <div className={`dy-cmp${up ? " is-up" : down ? " is-down" : ""}`}>
        {m.sec && m.prevSec ? (
          <span className="dy-chip">{`${up ? "▲ +" : down ? "▼ −" : "= "}${Math.abs(diffMin)} min${m.pct != null ? ` · ${up ? "+" : down ? "−" : ""}${Math.abs(m.pct)} %` : ""}`}</span>
        ) : null}
        <span className="dy-cmp-txt">{compare}</span>
      </div>
      {m.sec ? (
        <>
          <div className="dy-block">
            <h4>{t("Deine Lieblingszeit")}</h4>
            <p className="dy-fav"><b>{t(slot ? slot.label : "")}</b>{slot ? <small>{t("{from}–{to} Uhr", { from: slot.from, to: slot.to })}</small> : null}</p>
            <div className="dy-slots" aria-hidden="true">
              {SLOTS.map((x) => (
                <div key={x.id} className={x.id === m.slot ? "dy-slot is-fav" : "dy-slot"}>
                  <i style={{ height: `${Math.max(4, Math.round(((m.slots[x.id] || 0) / maxSlot) * 100))}%` }} />
                  <span>{SLOT_SHORT[x.id]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dy-block">
            <h4>{t("Deine Top 3")}</h4>
            <ol className="dy-top">
              {m.top.map((x, i) => (
                <li key={x.key}>
                  <span className="dy-rank">{i + 1}</span>
                  <div className="dy-top-txt">
                    <div className="dy-top-row"><b>{entryName(x)}</b><small>{`${minutes(x.sec)} min`}</small></div>
                    <div className="dy-bar"><i style={{ width: `${Math.round((x.sec / maxTop) * 100)}%` }} /></div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={on ? "dy-switch on" : "dy-switch"} onClick={() => onChange(!on)}>
      <span className="dy-knob" aria-hidden="true" />
    </button>
  );
}

export default function PracticeDiary() {
  const [log, setLog] = useState(loadLog);
  const [on, setOn] = useState(diaryOn);
  const [undo, setUndo] = useState(null); // { removed, index }
  const undoTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  function toggle(next) {
    setDiaryOn(next);
    setOn(next);
    setUndo(null);
  }

  function del(id) {
    const r = removeEntry(loadLog(), id);
    if (!r.removed) return;
    saveLog(r.log);
    setLog(r.log);
    setUndo({ removed: r.removed, index: r.index });
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 5000);
  }

  function restore() {
    if (!undo) return;
    const next = restoreEntry(loadLog(), undo.removed, undo.index);
    saveLog(next);
    setLog(next);
    setUndo(null);
    window.clearTimeout(undoTimer.current);
  }

  const days = groupByDay(log);
  const week = weekStats(log);
  return (
    <div className="dy-wrap">
      <p className="dy-kick">{`${t("Neu")} · ${t("Übe-Tagebuch")}`}</p>
      <p className="dy-lead">{t("Jeder Schlag zählt! Hier landet automatisch, was du geübt hast - Tag für Tag.")}</p>
      <div className="dy-glass dy-set">
        <div className="dy-set-txt">
          <b>{t("Übe-Tagebuch führen")}</b>
          <small>{t("Zählt ab 30 Sekunden am Stück. Ein Eintrag pro Übung und Tag - mit Übezeit und höchstem Tempo.")}</small>
        </div>
        <Switch on={on} onChange={toggle} label={t("Übe-Tagebuch führen")} />
      </div>
      {!on ? (
        <p className="dy-off">{t("Pausiert. Deine Einträge bleiben gespeichert und sind wieder da, sobald du das Tagebuch einschaltest.")}</p>
      ) : days.length === 0 ? (
        <div className="dy-glass dy-empty">
          <span className="dy-empty-ico" aria-hidden="true">🥁</span>
          <p>{t("Noch leer - aber nicht mehr lange! Starte Rudiments, Click-Trainer, Pyramide oder Hand Control und spiel mindestens 30 Sekunden.")}</p>
        </div>
      ) : (
        <>
          <div className="dy-week">
            <div><b>{minutes(week.sec)}</b><span>{t("min in 7 Tagen")}</span></div>
            <div><b>{week.days}</b><span>{t(week.days === 1 ? "Übetag" : "Übetage")}</span></div>
          </div>
          <MonthReport log={log} />
          {days.map((d) => (
            <section key={d.day} className="dy-day" aria-label={dayLabel(d.day)}>
              <h3><span>{dayLabel(d.day)}</span><small>{`${minutes(d.sec)} min`}</small></h3>
              <ul>
                {d.entries.map((e) => (
                  <li key={e.id} className="dy-glass dy-entry">
                    <div className="dy-entry-txt">
                      <b>{entryName(e)}</b>
                      <small>{`${minutes(e.sec)} min${e.bpm ? ` · ${e.bpm} BPM` : ""}${e.ex === "rudiments" || e.ex === "stick" ? ` · ${t(EX_TITLE[e.ex])}` : ""}`}</small>
                    </div>
                    <button type="button" className="dy-del" onClick={() => del(e.id)} aria-label={t("Eintrag löschen: {name}", { name: entryName(e) })} title={t("Löschen")}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      {undo ? (
        <div className="dy-toast dy-undo" role="status" aria-live="polite">
          <span>{t("Eintrag gelöscht.")}</span>
          <button type="button" onClick={restore}>{t("Rückgängig")}</button>
        </div>
      ) : null}
    </div>
  );
}
