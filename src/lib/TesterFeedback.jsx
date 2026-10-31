import { useEffect, useRef, useState } from "react";
import { fmtDate, getLang, t } from "./i18n.js";
import { EX_TITLE } from "./PracticeDiary.jsx";
import { COMMENT_MAX, NAME_MAX, isExpired, mailtoHref } from "./feedbackRules.js";
import {
  ASK_EVENT, CHANGE_EVENT, FEEDBACK_ENABLED, SETTINGS_EVENT, THANKS_EVENT,
  claimThanks, codeView, flush, forgetMine, loadFb, needsConsentPrompt, patchFb, readTestParams, refreshThanks,
  removeSpecial, saveSpecial, setConsent, setPlatform, submitFeedback,
} from "./feedbackClient.js";
import { takeForAchievement } from "./startModal.js";
import "./TesterFeedback.css";

// Test-Feedback der Web-/Testversion. In der Store-App rendert nichts davon (FEEDBACK_ENABLED = false).

if (FEEDBACK_ENABLED) readTestParams();

function useFb() {
  const [fb, setFb] = useState(loadFb);
  useEffect(() => {
    const on = () => setFb(loadFb());
    window.addEventListener(CHANGE_EVENT, on);
    return () => window.removeEventListener(CHANGE_EVENT, on);
  }, []);
  return fb;
}

function exName(seg) {
  const title = t(EX_TITLE[seg?.ex] || seg?.ex || "");
  if (seg?.ex === "rudiments" && seg.label) return seg.label;
  if (seg?.ex === "stick" && seg.item != null) return `${title} · ${t("Nr. {n}", { n: seg.item })}`;
  return title;
}

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
}

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={on ? "dy-switch on" : "dy-switch"} onClick={() => onChange(!on)}>
      <span className="dy-knob" aria-hidden="true" />
    </button>
  );
}

// 1) Einmalige Frage beim Start - Standard: nein (Schließen = „Lieber nicht“).
function Consent({ onDone }) {
  const yes = useRef(null);
  useEffect(() => { yes.current?.focus(); }, []);
  const no = () => { setConsent(false); onDone(); };
  useEscape(true, no);
  return (
    <div className="modal fb-modal" onClick={no}>
      <div className="modal-card fb-card" role="dialog" aria-modal="true" aria-labelledby="fb-consent-h" onClick={(e) => e.stopPropagation()}>
        <div className="fb-badge" aria-hidden="true">🥁</div>
        <div className="modal-head" id="fb-consent-h">{t("Testphase")}</div>
        <p className="fb-lead">{t("Hilf mir, Schlagfertig besser zu machen! Darf ich dich nach Übungen kurz fragen, wie sie dir gefallen? Ohne Namen, freiwillig und jederzeit in den Einstellungen abschaltbar.")}</p>
        <div className="fb-actions">
          <button ref={yes} type="button" className="fb-btn fb-primary" onClick={() => { setConsent(true); onDone(); }}>{t("Ja, ich bin dabei 🥁")}</button>
          <button type="button" className="fb-btn" onClick={no}>{t("Lieber nicht")}</button>
        </div>
        <p className="fb-fine">{t("Details findest du in der Datenschutzerklärung unter „Test-Feedback“.")}</p>
      </div>
    </div>
  );
}

// 2) Nach Stop einer Übung: 👍🏻/👎🏻, optional Kommentar, Zitat-Erlaubnis.
function Ask({ seg, onClose, onReached }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");
  const [quote, setQuote] = useState(false);
  const [sent, setSent] = useState(false);
  useEscape(true, onClose);
  function send() {
    if (!rating) return;
    const { reached } = submitFeedback({ seg, rating, comment: comment.trim(), quote, lang: getLang() });
    setSent(true);
    window.setTimeout(() => { onClose(); if (reached) onReached(); }, reached ? 900 : 1300);
  }
  return (
    <div className="modal fb-modal fb-sheet-wrap" onClick={onClose}>
      <div className="modal-card fb-card fb-sheet" role="dialog" aria-modal="true" aria-labelledby="fb-ask-h" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="fb-sent" role="status"><span aria-hidden="true">🥁</span><b>{t("Danke dir! Das hilft mir sehr.")}</b></div>
        ) : (
          <>
            <div className="modal-head" id="fb-ask-h">{`${t("Kurzes Feedback")} · ${exName(seg)}`}</div>
            <p className="fb-q">{t("Wie hat dir die Übung gefallen?")}</p>
            <div className="fb-thumbs" role="radiogroup" aria-label={t("Bewertung")}>
              <button type="button" role="radio" aria-checked={rating === "up"} className={rating === "up" ? "fb-thumb on" : "fb-thumb"} onClick={() => setRating("up")} aria-label={t("Gefällt mir")}>👍🏻</button>
              <button type="button" role="radio" aria-checked={rating === "down"} className={rating === "down" ? "fb-thumb on is-down" : "fb-thumb"} onClick={() => setRating("down")} aria-label={t("Gefällt mir nicht")}>👎🏻</button>
            </div>
            <label className="fb-label">
              {t("Was war gut, was kann besser werden? (optional)")}
              <textarea className="fb-input" rows={3} maxLength={COMMENT_MAX} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("z. B. Tempo, Erklärung, Klang …")} />
            </label>
            <label className="fb-check">
              <input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} />
              <span>{t("Darf ich dich ohne Namen zitieren?")}</span>
            </label>
            <div className="fb-actions">
              <button type="button" className="fb-btn fb-primary" disabled={!rating} onClick={send}>{t("Absenden")}</button>
              <button type="button" className="fb-btn" onClick={onClose}>{t("Heute nicht")}</button>
            </div>
            <button type="button" className="fb-link" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent(SETTINGS_EVENT)); }}>{t("Test-Feedback abschalten")}</button>
          </>
        )}
      </div>
    </div>
  );
}

// 3) Überraschungs-Erfolg: Dankeschön-Nummer, Gerät, „Bei Tom melden“; später Code mit „gültig bis“.
function Thanks({ onClose }) {
  const fb = useFb();
  const thanks = fb.thanks || claimThanks();
  useEffect(() => {
    const cur = loadFb();
    if (cur.thanks && !cur.thanks.shown) patchFb({ thanks: { ...cur.thanks, shown: true } });
    refreshThanks();
  }, []);
  useEscape(true, onClose);
  const lang = getLang();
  const { code, validUntil } = codeView(thanks);
  const expired = !!code && isExpired(validUntil);
  const platform = thanks.platform || "";
  const [y, m, d] = (validUntil || "").split("-").map(Number);
  const until = validUntil ? fmtDate(new Date(y, m - 1, d)) : "";
  return (
    <div className="modal fb-modal" onClick={onClose}>
      <div className="modal-card fb-card fb-thanks" role="dialog" aria-modal="true" aria-labelledby="fb-th-h" onClick={(e) => e.stopPropagation()}>
        <div className="fb-trophy" aria-hidden="true">🏆</div>
        <div className="modal-head fb-gold">{t("Geheimer Erfolg freigeschaltet")}</div>
        <h2 className="fb-title" id="fb-th-h">{t("Danke, dass du mitgeholfen hast! 🥁")}</h2>
        <p className="fb-lead">{t("Als Dankeschön bekommst du die Vollversion geschenkt, sobald Schlagfertig online ist.")}</p>
        <div className="fb-num-box">
          <small>{t("Deine Dankeschön-Nummer")}</small>
          <b className="fb-num">{thanks.num}</b>
        </div>
        <p className="fb-hint">📸 {t("Mach am besten gleich einen Screenshot - mit dieser Nummer holst du dir die Vollversion ab.")}</p>
        <p className="fb-q fb-q-sm">{t("Welches Handy nutzt du?")}</p>
        <div className="seg fb-seg" role="radiogroup" aria-label={t("Welches Handy nutzt du?")}>
          {[["ios", "iPhone"], ["android", "Android"]].map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={platform === id} className={platform === id ? "on" : ""} onClick={() => setPlatform(id)}>{label}</button>
          ))}
        </div>
        {code ? (
          expired ? (
            <div className="fb-code is-expired" role="alert">
              <div className="fb-code-row"><span>{t("Dein Code")}</span><b>{code}</b></div>
              <small>{t("gültig bis {date}", { date: until })}</small>
              <p>{t("Hoppla, dieser Code ist leider abgelaufen. Kein Problem, schreib mir kurz, dann bekommst du einen neuen! 🥁")}</p>
              <a className="fb-btn fb-primary fb-gold-btn" href={mailtoHref({ num: thanks.num, platform, expired: true, code, lang })}>{t("Tom Bescheid geben")}</a>
            </div>
          ) : (
            <div className="fb-code">
              <div className="fb-code-row"><span>{t("Dein Code")}</span><b>{code}</b></div>
              <small>{t("gültig bis {date}", { date: until })}</small>
              <p>{t("Löse ihn im App Store bzw. bei Google Play ein. Klappt etwas nicht? Schreib mir einfach.")}</p>
            </div>
          )
        ) : null}
        <div className="fb-actions">
          {!expired ? <a className="fb-btn fb-primary" href={mailtoHref({ num: thanks.num, platform, lang })}>{t("Bei Tom melden")}</a> : null}
          <button type="button" className="fb-btn" onClick={onClose}>{t("Schließen")}</button>
        </div>
        <button type="button" className="fb-link" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: { focus: "special" } })); }}>{t("Möchtest du bei den Special Thanks stehen?")}</button>
      </div>
    </div>
  );
}

// Einstellungen: Einwilligung, Special Thanks, Dankeschön, eigene Feedbacks löschen.
function Settings({ onClose, onThanks, focus }) {
  const fb = useFb();
  const [name, setName] = useState(fb.special?.name || "");
  const [contact, setContact] = useState(fb.special?.contact || "");
  const [forgot, setForgot] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => { if (focus === "special") nameRef.current?.focus(); }, [focus]);
  useEscape(true, onClose);
  const on = fb.consent === true;
  return (
    <div className="modal fb-modal" onClick={onClose}>
      <div className="modal-card fb-card fb-settings" role="dialog" aria-modal="true" aria-labelledby="fb-set-h" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head" id="fb-set-h">{t("Einstellungen · Test-Feedback")}</div>
        <div className="dy-glass dy-set">
          <div className="dy-set-txt">
            <b>{t("Nach Übungen nach Feedback fragen")}</b>
            <small>{t("Ohne Namen, freiwillig. Die App sendet deine Bewertung, deinen Kommentar, die Übung, das Datum und eine zufällige Geräte-Kennung.")}</small>
          </div>
          <Switch on={on} onChange={(v) => setConsent(v)} label={t("Nach Übungen nach Feedback fragen")} />
        </div>
        <section className="fb-sec">
          <h3>{t("Special Thanks")}</h3>
          <p>{t("Möchtest du in der App namentlich bei den Special Thanks stehen? Dann trag hier selbst deinen Namen ein - gespeichert getrennt von deinen Feedbacks.")}</p>
          <input ref={nameRef} className="fb-input" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Dein Name")} aria-label={t("Dein Name")} />
          <input className="fb-input" maxLength={80} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("Kontakt (optional, z. B. Instagram)")} aria-label={t("Kontakt (optional, z. B. Instagram)")} />
          <div className="fb-actions">
            <button type="button" className="fb-btn fb-primary" disabled={!name.trim() || (fb.special && fb.special.name === name.trim() && (fb.special.contact || "") === contact.trim())} onClick={() => saveSpecial(name.trim(), contact.trim())}>{fb.special ? t("Ändern") : t("Eintragen")}</button>
            {fb.special ? <button type="button" className="fb-btn" onClick={() => { removeSpecial(); setName(""); setContact(""); }}>{t("Austragen")}</button> : null}
          </div>
          {fb.special ? <p className="fb-ok">✓ {t("Eingetragen als „{name}“.", { name: fb.special.name })}</p> : null}
          <div className="fb-credit">
            <img src="/logo-vollversion.png" width="512" height="509" alt={t("Logo Schlagfertig Vollversion")} />
            <small>{t("Logo: Thomas Schuster (mit KI erstellt)")}</small>
          </div>
        </section>
        {fb.thanks ? (
          <button type="button" className="fb-btn fb-gold-btn fb-wide" onClick={() => { onClose(); onThanks(); }}>🏆 {t("Dein Dankeschön ({num})", { num: fb.thanks.num })}</button>
        ) : null}
        <section className="fb-sec">
          <button type="button" className="fb-link fb-danger" onClick={() => { forgetMine(); setForgot(true); }} disabled={forgot}>{forgot ? t("Alles klar, ich lösche deine Feedbacks.") : t("Deine bisherigen Feedbacks löschen")}</button>
        </section>
        <div className="fb-actions">
          <button type="button" className="fb-btn" onClick={onClose}>{t("Fertig")}</button>
        </div>
      </div>
    </div>
  );
}

// Fußzeilen-Link (nur Testversion): öffnet die Einstellungen.
export function FeedbackLink() {
  if (!FEEDBACK_ENABLED) return null;
  return <button type="button" className="foot-link" onClick={() => window.dispatchEvent(new CustomEvent(SETTINGS_EVENT))}>{t("Test-Feedback")}</button>;
}

// Einmal in App einhängen (Startseite und Übungsansichten).
// pick = Start-Popup dieses App-Starts (App.jsx, startModal.js): "consent" | "achievement" | …
export default function TesterFeedback({ pick = null }) {
  const [consent, setConsentOpen] = useState(false);
  const [ask, setAsk] = useState(null);
  const [thanks, setThanks] = useState(false);
  const [settings, setSettings] = useState(null);
  useEffect(() => { flush(); }, []);
  // Start-Popup (höchstens eins pro Start, siehe startModal.js): Erfolg nachholen oder Einwilligung fragen.
  useEffect(() => {
    if (!FEEDBACK_ENABLED) return undefined;
    // Nach Rückkehr zur Startseite wird die Komponente neu eingehängt - nur zeigen, was noch offen ist.
    const fb = loadFb();
    const want = (pick === "consent" && needsConsentPrompt()) || (pick === "achievement" && fb.thanks && !fb.thanks.shown);
    if (!want) return undefined;
    const id = window.setTimeout(() => (pick === "consent" ? setConsentOpen(true) : setThanks(true)), 400);
    return () => window.clearTimeout(id);
  }, [pick]);
  useEffect(() => {
    const onAsk = (e) => setAsk(e.detail || null);
    const onThanks = () => setThanks(true);
    const onSettings = (e) => setSettings(e.detail || {});
    window.addEventListener(ASK_EVENT, onAsk);
    window.addEventListener(THANKS_EVENT, onThanks);
    window.addEventListener(SETTINGS_EVENT, onSettings);
    return () => {
      window.removeEventListener(ASK_EVENT, onAsk);
      window.removeEventListener(THANKS_EVENT, onThanks);
      window.removeEventListener(SETTINGS_EVENT, onSettings);
    };
  }, []);
  if (!FEEDBACK_ENABLED) return null;
  return (
    <>
      {consent ? <Consent onDone={() => setConsentOpen(false)} /> : null}
      {ask ? <Ask seg={ask} onClose={() => setAsk(null)} onReached={() => { takeForAchievement(); setThanks(true); }} /> : null}
      {thanks ? <Thanks onClose={() => setThanks(false)} /> : null}
      {settings ? <Settings focus={settings.focus} onClose={() => setSettings(null)} onThanks={() => setThanks(true)} /> : null}
    </>
  );
}
