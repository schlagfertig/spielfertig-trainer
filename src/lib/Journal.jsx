// Journal: Tagebuch, Hausaufgaben und Karteikasten unter einer Kachel, unten „Journal mitnehmen“ (Export/Import).
import { useEffect, useState } from "react";
import { getLang, t } from "./i18n.js";
import { loadSession, saveSession } from "./session.js";
import { RUDIMENTS } from "./rudiments.js";
import { RudimentStaff } from "./staff.jsx";
import PracticeDiary, { entryName } from "./PracticeDiary.jsx";
import { CARD_LEVELS, addCard, hasCard, removeCard, removeHw, setCardLevel, setHwDone, sortCards, splitHw, toggleCard, toggleHw } from "./journal.js";
import { JOURNAL_EVENT, buildEntry, getCtx, journalOn, loadCards, loadHw, restoreSessions, saveCards, saveHw } from "./journalStore.js";
import { dayKey } from "./practiceLog.js";
import JournalBackup from "./JournalBackup.jsx";
import { askUnlock, isUnlocked, rudimentOpen, stickOpen, withinFreeCount, FREE_JOURNAL_N } from "./demo.js";
import "../styles-journal.css";

const TABS = [
  { id: "diary", label: "Tagebuch" },
  { id: "hw", label: "Hausaufgaben" },
  { id: "cards", label: "Karteikasten" },
];
// Welche Übung zu welcher Ansicht gehört (Click-Trainer meldet auch aus NoClick heraus „click“).
const EX_OF_VIEW = { rudiments: "rudiments", click: "click", pyramid: "pyramid", stick: "stick", first: "first" }; // kein Würfel

function useJournal() {
  const [, setN] = useState(0);
  useEffect(() => {
    const on = () => setN((n) => n + 1);
    window.addEventListener(JOURNAL_EVENT, on);
    return () => window.removeEventListener(JOURNAL_EVENT, on);
  }, []);
}

const rudName = (id) => String(RUDIMENTS.find((r) => r.id === id)?.label || "").replace(/^\d+\.\s*/, "");

export function hwName(x) {
  if (x.ex === "click") return x.info?.mode === "noclick" ? "NoClick" : t("Click-Trainer");
  if (x.ex === "first") return t(x.label || "Einstieg");
  if (x.ex === "rudiments" && !x.label) return rudName(x.item);
  return entryName(x);
}

export function hwDetail(x) {
  const i = x.info || {};
  const bpm = i.bpm ? `${i.bpm} BPM` : "";
  const parts = [];
  if (x.ex === "rudiments") parts.push("Rudiments", bpm);
  else if (x.ex === "click") {
    if (i.mode === "noclick") {
      parts.push(t("{c} mit · {g} ohne Click · {b} Beats", { c: i.click, g: i.gap, b: i.beats }), bpm);
      if (i.countIn) parts.push(t(i.countIn === 2 ? "2 Takte einzählen" : "1 Takt einzählen"));
    } else if (i.mode === "ramp") parts.push(t("Tempo steigern"), i.cap ? `${i.bpm} → ${i.cap} BPM` : bpm);
    else parts.push(t("Tempo halten"), bpm);
  }
  else if (x.ex === "stick") parts.push(bpm);
  else if (x.ex === "pyramid") parts.push(bpm);
  else if (x.ex === "first") parts.push(t("Einstieg"));
  return parts.filter(Boolean).join(" · ");
}

export function whenText(at) {
  if (!at) return t("Noch nicht geübt - leg los!");
  const d = dayKey(at);
  if (d === dayKey()) return t("Zuletzt geübt: heute");
  if (d === dayKey(Date.now() - 86400000)) return t("Zuletzt geübt: gestern");
  let s = d;
  try { s = new Date(at).toLocaleDateString(getLang() === "en" ? "en-GB" : "de-DE", { day: "numeric", month: "short" }); } catch { /* egal */ }
  return t("Zuletzt geübt: {date}", { date: s });
}

const Trash = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
);

// Glas-Knöpfe in der Kopfzeile einer Übung: „Zu Hausaufgaben“ (und bei Rudiments „In den Karteikasten“).
export function JournalBar({ view }) {
  useJournal();
  if (!journalOn()) return null;
  const ctx = getCtx();
  if (!ctx || ctx.ex !== EX_OF_VIEW[view]) return null;
  const added = loadHw().items.some((x) => x.key === ctx.key);
  const rud = ctx.ex === "rudiments" && ctx.item != null ? ctx.item : null;
  const inBox = rud != null && hasCard(loadCards(), rud);
  return (
    <div className="jr-bar">
      <button type="button" className={added ? "jr-pill on" : "jr-pill"} aria-pressed={added} onClick={() => {
        const list = loadHw();
        const entry = buildEntry(getCtx() || ctx);
        const exists = list.items.some((x) => x.key === entry.key);
        if (!exists && !withinFreeCount(list.items.length)) { askUnlock(); return; }
        saveHw(toggleHw(list, entry).list);
      }}>
        <span aria-hidden="true">{added ? "✓" : "+"}</span>{t(added ? "In deinen Hausaufgaben" : "Zu Hausaufgaben")}
      </button>
      {rud != null ? (
        <button type="button" className={inBox ? "jr-pill on" : "jr-pill"} aria-pressed={inBox} onClick={() => {
          const list = loadCards();
          if (!inBox && !withinFreeCount(list.cards.length)) { askUnlock(); return; }
          saveCards(toggleCard(list, rud).list);
        }}>
          <span aria-hidden="true">{inBox ? "✓" : "+"}</span>{t(inBox ? "Im Karteikasten" : "In den Karteikasten")}
        </button>
      ) : null}
    </div>
  );
}

function targetLocked(x) {
  if (isUnlocked()) return false;
  if (x.view === "archive") return true;
  if (x.ex === "click" && (x.info?.mode === "noclick" || x.sessions?.click?.mode === "noclick")) return true;
  if (x.ex === "stick" && !stickOpen(x.item ?? x.preset?.ex)) return true;
  if (x.ex === "rudiments") {
    const id = x.item ?? x.preset?.rud;
    if (id != null && !rudimentOpen(id)) return true;
  }
  return false;
}

function openHw(x, onOpen) {
  if (targetLocked(x)) { askUnlock(); return; }
  restoreSessions(x);
  onOpen?.(x.view, x.preset || null);
}

function capSlice(list) {
  if (isUnlocked()) return { items: list, more: 0 };
  return { items: list.slice(0, FREE_JOURNAL_N), more: Math.max(0, list.length - FREE_JOURNAL_N) };
}

function FreeLimit({ more }) {
  if (!more) return null;
  return (
    <div className="dy-glass dy-empty">
      <p>{t("Die ersten zwei sind kostenlos. Für den Rest brauchst du die volle App.")}</p>
      <button type="button" className="jr-go" style={{ marginTop: 10 }} onClick={() => askUnlock()}>{t("Freischalten")}</button>
    </div>
  );
}

function HwItem({ x, onOpen }) {
  return (
    <li className={x.done ? "dy-glass jr-item is-done" : "dy-glass jr-item"}>
      <button type="button" className="jr-item-main" onClick={() => openHw(x, onOpen)} aria-label={t("{name} üben", { name: hwName(x) })}>
        <b>{hwName(x)}</b>
        <small>{hwDetail(x)}</small>
        <span className={x.lastAt ? "jr-when" : "jr-when is-new"}>{whenText(x.lastAt)}</span>
      </button>
      <div className="jr-acts">
        <button type="button" className="jr-go" onClick={() => openHw(x, onOpen)}>{t("Üben", null, "hw")} ›</button>
        {x.done ? (
          <button type="button" className="jr-chip" onClick={() => saveHw(setHwDone(loadHw(), x.key, false))}>{t("Nochmal üben")}</button>
        ) : (
          <button type="button" className="jr-chip jr-sitzt" onClick={() => saveHw(setHwDone(loadHw(), x.key, true))}>✓ {t("Sitzt")}</button>
        )}
        <button type="button" className="dy-del" onClick={() => saveHw(removeHw(loadHw(), x.key))} aria-label={t("Entfernen: {name}", { name: hwName(x) })} title={t("Entfernen")}><Trash /></button>
      </div>
    </li>
  );
}

function Homework({ onOpen }) {
  const { open, done } = splitHw(loadHw());
  const capped = capSlice([...open, ...done]);
  const keys = new Set(capped.items.map((x) => x.key));
  const openVis = open.filter((x) => keys.has(x.key));
  const doneVis = done.filter((x) => keys.has(x.key));
  return (
    <div className="jr-pane">
      <p className="dy-lead">{t("Deine Hausaufgaben für diese Woche - tipp drauf und leg direkt los, mit genau deinen Einstellungen.")}</p>
      {open.length === 0 && done.length === 0 ? (
        <div className="dy-glass dy-empty">
          <span className="dy-empty-ico" aria-hidden="true">📒</span>
          <p>{t("Noch keine Hausaufgaben. Öffne eine Übung und tipp oben auf „Zu Hausaufgaben“ - dann wartet sie hier auf dich.")}</p>
        </div>
      ) : null}
      {openVis.length ? <ul className="jr-list">{openVis.map((x) => <HwItem key={x.key} x={x} onOpen={onOpen} />)}</ul> : null}
      {openVis.length === 0 && doneVis.length ? <p className="jr-allgood">{t("Alles erledigt - stark! Such dir die nächste Hausaufgabe aus.")}</p> : null}
      {doneVis.length ? (
        <section className="jr-done" aria-label={t("Sitzt schon")}>
          <h3>{t("Sitzt schon")} <span aria-hidden="true">🎉</span></h3>
          <ul className="jr-list">{doneVis.map((x) => <HwItem key={x.key} x={x} onOpen={onOpen} />)}</ul>
        </section>
      ) : null}
      <FreeLimit more={capped.more} />
    </div>
  );
}

function Cards({ onOpen }) {
  const all = sortCards(loadCards());
  const capped = capSlice(all);
  const cards = capped.items;
  const free = RUDIMENTS.filter((r) => !all.some((c) => c.rud === r.id));
  const [pick, setPick] = useState("");
  const add = () => {
    const id = Number(pick || free[0]?.id);
    if (!id) return;
    const list = loadCards();
    if (!withinFreeCount(list.cards.length)) { askUnlock(); return; }
    saveCards(addCard(list, id));
    setPick("");
  };
  return (
    <div className="jr-pane">
      <p className="dy-lead">{t("Deine Rudiments zum Dranbleiben - wie Karteikarten. Leg rein, was du besser können willst, und arbeite dich von „Neu“ bis „Sitzt“.")}</p>
      {free.length ? (
        <div className="dy-glass jr-add">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={t("Rudiment auswählen")}>
            <option value="">{t("Rudiment auswählen …")}</option>
            {free.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button type="button" className="jr-go" onClick={add} disabled={!pick}>+ {t("Karte")}</button>
        </div>
      ) : null}
      {cards.length === 0 ? (
        <div className="dy-glass dy-empty">
          <span className="dy-empty-ico" aria-hidden="true">🗂️</span>
          <p>{t("Dein Karteikasten ist noch leer. Wähl oben ein Rudiment aus oder tipp in den Rudiments auf „In den Karteikasten“.")}</p>
        </div>
      ) : (
        <ul className="jr-cards">
          {cards.map((c) => {
            const r = RUDIMENTS.find((x) => x.id === c.rud);
            if (!r) return null;
            const name = rudName(c.rud);
            return (
              <li key={c.rud} className={`dy-glass jr-card lv-${c.level}`}>
                <button type="button" className="jr-card-main" onClick={() => { if (!rudimentOpen(c.rud)) { askUnlock(); return; } onOpen?.("rudiments", { rud: c.rud }); }} aria-label={t("{name} üben", { name })}>
                  <span className="jr-card-head"><span className="jr-no">{c.rud}</span><b>{name}</b></span>
                  <span className="jr-thumb" aria-hidden="true"><RudimentStaff rud={r} /></span>
                  <span className={c.lastAt ? "jr-when" : "jr-when is-new"}>{whenText(c.lastAt)}</span>
                </button>
                <div className="jr-card-foot">
                  <div className="seg jr-lv" role="radiogroup" aria-label={t("Stufe: {name}", { name })}>
                    {CARD_LEVELS.map((l) => (
                      <button key={l.id} type="button" role="radio" aria-checked={c.level === l.id} className={c.level === l.id ? `on lv-${l.id}` : ""} onClick={() => saveCards(setCardLevel(loadCards(), c.rud, l.id))}>{t(l.label)}</button>
                    ))}
                  </div>
                  <button type="button" className="dy-del" onClick={() => saveCards(removeCard(loadCards(), c.rud))} aria-label={t("Entfernen: {name}", { name })} title={t("Entfernen")}><Trash /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <FreeLimit more={capped.more} />
    </div>
  );
}

export default function Journal({ onOpen }) {
  useJournal();
  const [tab, setTabRaw] = useState(() => (TABS.some((x) => x.id === loadSession("journal", {}).tab) ? loadSession("journal", {}).tab : "diary"));
  const setTab = (id) => { setTabRaw(id); saveSession("journal", { tab: id }); };
  const hwSplit = splitHw(loadHw());
  const hwOpen = capSlice([...hwSplit.open, ...hwSplit.done]).items.filter((x) => !x.done).length;
  const [gen, setGen] = useState(0); // nach einem Import neu laden
  return (
    <div className="jr-wrap">
      <div className="seg jr-tabs" role="tablist" aria-label={t("Journal")}>
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>
            {t(x.label)}{x.id === "hw" && hwOpen ? <span className="jr-badge">{hwOpen}</span> : null}
          </button>
        ))}
      </div>
      <div key={gen}>{tab === "diary" ? <PracticeDiary /> : tab === "hw" ? <Homework onOpen={onOpen} /> : <Cards onOpen={onOpen} />}</div>
      <JournalBackup onChanged={() => setGen((g) => g + 1)} />
    </div>
  );
}
