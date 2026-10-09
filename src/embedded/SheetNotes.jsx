import { useCallback, useEffect, useRef, useState } from "react";
import { updateSheetNotes } from "../lib/archive.js";
import { t } from "../lib/i18n.js";
import {
  addPin, addStroke, clearPage, COLOR_KEYS, COLORS, emptyNotes, eraseAt, getPage, makeStroke, MAX_PIN_TEXT, MAX_TEXT,
  normalizeNotes, popHistory, preview, pushHistory, removePin, setText, strokePath, summary, updatePin,
} from "../lib/sheetNotes.js";

/* Noten: Notizfeld, Stift und Textmarker pro Blatt (Logik + Speicherformat: lib/sheetNotes.js). */

export const NOTES_CSS = `
  .sn-bar { display: flex; align-items: center; gap: 2px; padding: 6px 6px; touch-action: manipulation; background: #12171a; border-bottom: 1px solid #2f383d; overflow-x: auto; scrollbar-width: none; }
  .sn-bar::-webkit-scrollbar { display: none; }
  .sn-bar.edit { background: linear-gradient(180deg, rgba(92,200,184,.16), rgba(92,200,184,.06)); border-bottom-color: rgba(92,200,184,.55); }
  .sn-btn { flex: 0 0 auto; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-width: 48px; min-height: 48px; padding: 4px 5px; border-radius: 12px; border: 1px solid transparent; background: transparent; color: #cfe9e4; font: 700 11px/1.1 Figtree, sans-serif; letter-spacing: .02em; cursor: pointer; position: relative; }
  .sn-btn svg { width: 22px; height: 22px; }
  .sn-btn.on { background: #5cc8b8; color: #06120f; border-color: #5cc8b8; }
  .sn-btn.done { position: sticky; right: 0; background: #17312d; color: #5cc8b8; border-color: rgba(92,200,184,.6); }
  .sn-btn:disabled { opacity: .35; cursor: default; }
  .sn-btn:focus-visible { outline: 2px solid #5cc8b8; outline-offset: 1px; }
  .sn-dot { position: absolute; top: 5px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #e8b84b; box-shadow: 0 0 0 2px #12171a; }
  .sn-sep { flex: 0 0 1px; height: 30px; background: #2f383d; margin: 0 4px; }
  .sn-grow { flex: 1 0 4px; }
  .sn-sw { flex: 0 0 auto; width: 34px; height: 34px; margin: 0 1px; border-radius: 50%; border: 2px solid #2f383d; background: transparent; padding: 0; cursor: pointer; display: grid; place-items: center; }
  .sn-sw i { display: block; width: 20px; height: 20px; border-radius: 50%; }
  .sn-sw.on { border-color: #f4f7f6; box-shadow: 0 0 0 2px #5cc8b8; }
  .sn-sw:focus-visible { outline: 2px solid #5cc8b8; outline-offset: 2px; }
  .sn-hint { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); z-index: 4; pointer-events: none; max-width: calc(100% - 120px); text-align: center; background: rgba(6,18,15,.86); color: #5cc8b8; border: 1px solid rgba(92,200,184,.55); border-radius: 999px; padding: 6px 14px; font: 700 13px/1.3 Figtree, sans-serif; animation: sn-fade 4.5s ease forwards; }
  @keyframes sn-fade { 0%, 75% { opacity: 1; } 100% { opacity: 0; } }
  .sn-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .sn-pins { position: absolute; inset: 0; pointer-events: none; }
  .sn-pin { position: absolute; transform-origin: 0 100%; transform: translate(0, -100%) scale(var(--zv-inv, 1)); pointer-events: auto; display: flex; align-items: flex-start; gap: 6px; max-width: 170px; padding: 5px 8px 6px 6px; border: 0; border-radius: 10px 10px 10px 2px; background: #ffe98a; color: #2a2306; font: 700 12px/1.25 Figtree, sans-serif; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,.35); cursor: pointer; }
  .sn-pin b { flex: 0 0 auto; display: grid; place-items: center; min-width: 18px; height: 18px; border-radius: 50%; background: #1f9e8c; color: #fff; font: 800 11px/1 Figtree, sans-serif; }
  .sn-pin span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
  .sn-pin:focus-visible { outline: 2px solid #1f9e8c; outline-offset: 2px; }
  .sn-pins.off .sn-pin { pointer-events: none; }
  .sn-panel { position: absolute; left: 0; right: 0; bottom: 0; z-index: 5; background: #161a1d; border-top: 1px solid rgba(92,200,184,.55); border-radius: 16px 16px 0 0; padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -8px 24px rgba(0,0,0,.45); display: flex; flex-direction: column; gap: 8px; }
  .sn-panel-head { display: flex; align-items: center; gap: 8px; }
  .sn-panel-head strong { flex: 1; color: #f4f7f6; font: 700 16px Figtree, sans-serif; }
  .sn-saved { color: #8a969c; font: 700 12px Figtree, sans-serif; }
  .sn-text { width: 100%; box-sizing: border-box; min-height: 110px; max-height: 32dvh; resize: vertical; background: #0f1315; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 10px; padding: 10px 12px; font: 500 16px/1.4 Figtree, sans-serif; }
  .sn-text:focus-visible { outline: 2px solid #5cc8b8; outline-offset: 1px; }
  @media (orientation: landscape) and (min-width: 820px) {
    .sn-panel { left: auto; top: 0; width: 340px; border-radius: 16px 0 0 16px; border-top: 0; border-left: 1px solid rgba(92,200,184,.55); padding-bottom: 12px; }
    .sn-text { flex: 1; max-height: none; resize: none; }
    /* Tablet quer: Blatt rückt neben das Notizfeld, nichts liegt darunter */
    .sn-side > .zv { width: calc(100% - 340px); }
    .sn-side > .arch-nav.next { right: 346px; }
  }
  .sn-pinedit .modal-card { width: min(400px, 100%); }
  .sn-card-note { display: flex; gap: 6px; align-items: baseline; margin-top: 6px; color: #e8b84b; font: 600 14px/1.35 Figtree, sans-serif; }
  .sn-card-note svg { flex: 0 0 auto; width: 14px; height: 14px; transform: translateY(2px); }
  .sn-card-tag { background: rgba(232,184,75,.12); color: #e8b84b; border: 1px solid rgba(232,184,75,.4); border-radius: 999px; padding: 2px 8px; font: 700 12px Figtree, sans-serif; }
`;

const I = {
  note: <path d="M5 4h10l4 4v12H5z M15 4v4h4 M8 12h8 M8 16h6" />,
  pen: <path d="M4 20l1-5L16 4l4 4L9 19z M14 6l4 4" />,
  pin: <path d="M5 4h14v11h-7l-5 5v-5H5z" />,
  undo: <path d="M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3" />,
  eraser: <path d="M8 20h12 M4 15l9-10 7 7-8 8H8z M9 10l7 7" />,
  trash: <path d="M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13" />,
  check: <path d="M5 12l5 5 9-10" />,
  eye: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6" />,
  eyeOff: <path d="M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9 M6.5 6.6C3.8 8.4 2 12 2 12s4 7 10 7c1.8 0 3.4-.6 4.8-1.4 M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
};
export function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[name]}</svg>
  );
}

/** Zeichnungen + Marker einer Seite – liegt in der Zoom-Fläche (zoomt/verschiebt mit). */
export function NotesOverlay({ notes, page, aspect, live, onPin, interactive = false }) {
  const pg = getPage(notes, page);
  const all = live ? [...pg.strokes, live] : pg.strokes;
  return (
    <>
      <svg className="sn-svg" viewBox={`0 0 1 ${aspect}`} preserveAspectRatio="none" aria-hidden="true">
        {all.map((s) => {
          const c = COLORS[s.color] || COLORS.red;
          return (
            <path key={s.id} d={strokePath(s, aspect)} fill="none" stroke={c.hex} strokeOpacity={c.alpha} strokeWidth={s.w}
              strokeLinecap="round" strokeLinejoin="round" style={s.color === "yellow" ? { mixBlendMode: "multiply" } : undefined} />
          );
        })}
      </svg>
      {pg.pins.length ? (
        <div className={interactive ? "sn-pins" : "sn-pins off"}>
          {pg.pins.map((m, i) => (
            <button key={m.id} type="button" className="sn-pin" tabIndex={interactive ? 0 : -1}
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
              onClick={() => onPin?.(m)} aria-label={t("Marker {n}: {text}", { n: i + 1, text: m.text })}>
              <b>{i + 1}</b><span>{m.text}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Notizen eines Blatts: Zustand, Rückgängig-Verlauf, automatisch speichern (kurz verzögert). */
export function useSheetNotes(file) {
  const [notes, setNotes] = useState(emptyNotes);
  const hist = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [saved, setSaved] = useState(true);
  const cur = useRef(notes);
  const idRef = useRef("");
  const pending = useRef(null);
  const timer = useRef(0);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    updateSheetNotes(p.id, p.notes).then(() => { if (!pending.current) setSaved(true); }).catch(() => {});
  }, []);

  const fileId = file?.id || "";
  useEffect(() => {
    if (!fileId) return;
    flush();
    idRef.current = fileId;
    const n = normalizeNotes(file?.notes);
    cur.current = n;
    setNotes(n);
    hist.current = [];
    setCanUndo(false);
    setSaved(true);
  }, [fileId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const change = useCallback((next, undoable = true) => {
    const prev = cur.current;
    if (!next || next === prev || !idRef.current) return;
    if (undoable) { hist.current = pushHistory(hist.current, prev); setCanUndo(true); }
    cur.current = next;
    setNotes(next);
    setSaved(false);
    pending.current = { id: idRef.current, notes: next };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 400);
  }, [flush]);

  const undo = useCallback(() => {
    const { stack, state } = popHistory(hist.current);
    hist.current = stack;
    setCanUndo(stack.length > 0);
    // Text hat sein eigenes Rückgängig (Tastatur); hier nur Zeichnungen und Marker
    if (state) change({ ...state, text: cur.current.text }, false);
  }, [change]);

  return { notes, cur, change, undo, canUndo, saved, flush };
}

/** Werkzeugleiste unter der Titelzeile im Vollbild. */
export function NotesToolbar({ mode, setMode, color, setColor, show, setShow, hasText, panel, setPanel, canUndo, onUndo, onClear, canClear }) {
  if (mode === "draw" || mode === "erase" || mode === "pin") {
    return (
      <div className="sn-bar edit" role="toolbar" aria-label={mode === "pin" ? t("Marker") : t("Stift")}>
        {mode !== "pin" ? (
          <>
            {COLOR_KEYS.map((k) => (
              <button key={k} type="button" className={mode === "draw" && color === k ? "sn-sw on" : "sn-sw"}
                aria-pressed={mode === "draw" && color === k}
                aria-label={{ red: t("Rot"), teal: t("Türkis"), yellow: t("Gelb (Leuchtstift)") }[k]}
                onClick={() => { setColor(k); setMode("draw"); }}>
                <i style={{ background: COLORS[k].hex, opacity: k === "yellow" ? 0.75 : 1 }} />
              </button>
            ))}
            <button type="button" className={mode === "erase" ? "sn-btn on" : "sn-btn"} aria-pressed={mode === "erase"} onClick={() => setMode(mode === "erase" ? "draw" : "erase")}>
              <Icon name="eraser" />{t("Radierer")}
            </button>
          </>
        ) : null}
        <button type="button" className="sn-btn" onClick={onUndo} disabled={!canUndo}><Icon name="undo" />{t("Rückgängig")}</button>
        {mode !== "pin" ? (
          <button type="button" className="sn-btn" onClick={onClear} disabled={!canClear}><Icon name="trash" />{t("Alles löschen")}</button>
        ) : null}
        <span className="sn-grow" />
        <button type="button" className="sn-btn done" onClick={() => setMode("view")}><Icon name="check" />{t("Fertig")}</button>
      </div>
    );
  }
  return (
    <div className="sn-bar" role="toolbar" aria-label={t("Notizen")}>
      <button type="button" className={panel ? "sn-btn on" : "sn-btn"} aria-pressed={panel} onClick={() => setPanel(!panel)}>
        <Icon name="note" />{t("Notiz")}{hasText && !panel ? <span className="sn-dot" aria-hidden="true" /> : null}
      </button>
      <button type="button" className="sn-btn" onClick={() => { setShow(true); setPanel(false); setMode("draw"); }}><Icon name="pen" />{t("Stift")}</button>
      <button type="button" className="sn-btn" onClick={() => { setShow(true); setPanel(false); setMode("pin"); }}><Icon name="pin" />{t("Marker")}</button>
      <span className="sn-grow" />
      <button type="button" className="sn-btn" aria-pressed={!show} onClick={() => setShow(!show)}>
        <Icon name={show ? "eye" : "eyeOff"} />{show ? t("Ausblenden") : t("Einblenden")}
      </button>
    </div>
  );
}

/** Notizfeld pro Blatt (unten; auf dem Tablet quer rechts). Speichert beim Tippen. */
export function NotePanel({ text, saved, onText, onClose }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="sn-panel" role="region" aria-label={t("Notiz zu diesem Blatt")}>
      <div className="sn-panel-head">
        <strong>{t("Notiz zu diesem Blatt")}</strong>
        <span className="sn-saved" aria-live="polite">{saved ? t("Gespeichert ✓") : "…"}</span>
        <button type="button" className="sn-btn done" onClick={onClose}><Icon name="check" />{t("Fertig")}</button>
      </div>
      <textarea ref={ref} className="sn-text" value={text} maxLength={MAX_TEXT}
        placeholder={t("Was willst du dir merken? Zum Beispiel: Takt 12 langsamer üben.")}
        aria-label={t("Notiz zu diesem Blatt")}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }} />
    </div>
  );
}

/** Marker lesen/bearbeiten/löschen (oder neuen Marker beschriften). */
export function PinDialog({ pin, isNew, onSave, onDelete, onClose }) {
  const [text, setTextV] = useState(pin.text || "");
  const born = useRef(Date.now()); // der Klick, der nach dem Tipp aufs Blatt folgt, schließt den Dialog nicht gleich wieder
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  function submit(e) {
    e.preventDefault();
    if (text.trim()) onSave(text.trim());
    else if (isNew) onClose();
    else onDelete();
  }
  return (
    <div className="modal sn-pinedit" style={{ zIndex: 70 }} onClick={() => { if (Date.now() - born.current > 450) onClose(); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="sn-pin-h" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head" id="sn-pin-h">{isNew ? t("Neuer Marker") : t("Marker")}</div>
        <textarea className="sn-text" style={{ minHeight: 90 }} value={text} maxLength={MAX_PIN_TEXT} autoFocus
          placeholder={t("Was willst du dir hier merken?")} aria-label={t("Text für den Marker")}
          onChange={(e) => setTextV(e.target.value)} />
        <div className="arch-actions">
          {isNew ? (
            <button type="button" className="ghost" onClick={onClose}>{t("Abbrechen")}</button>
          ) : (
            <button type="button" className="ghost" onClick={onDelete}>{t("Löschen")}</button>
          )}
          <button type="submit" className="ghost on" disabled={isNew && !text.trim()}>{t("Fertig")}</button>
        </div>
      </form>
    </div>
  );
}

/** Kurzinfo in der Übersicht: Notiz-Vorschau + Zeichnung/Marker. */
export function NotesBadge({ notes }) {
  const s = summary(notes);
  if (!s.any) return null;
  return (
    <>
      {s.text ? (
        <span className="sn-card-note"><Icon name="note" /><span>{preview(s.text)}</span></span>
      ) : null}
      {s.strokes || s.pins ? (
        <span className="arch-rowtags">
          {s.strokes ? <span className="sn-card-tag">{t("Zeichnung")}</span> : null}
          {s.pins ? <span className="sn-card-tag">{s.pins === 1 ? t("1 Marker") : t("{n} Marker", { n: s.pins })}</span> : null}
        </span>
      ) : null}
    </>
  );
}

/** Steuerung für FullView: Modus, Farbe, Stift-/Radierer-Gesten, Marker-Dialog. */
export function useAnnotator(file) {
  const api = useSheetNotes(file);
  const { cur, change } = api;
  const [mode, setMode] = useState("view"); // view | draw | erase | pin
  const [color, setColor] = useState("red");
  const [show, setShow] = useState(true);
  const [panel, setPanel] = useState(false);
  const [live, setLive] = useState(null);
  const [pinEdit, setPinEdit] = useState(null); // { page, pin, isNew }
  const [page, setPageNo] = useState(1);
  const stroke = useRef(null);
  const erase = useRef(null);

  useEffect(() => { setMode("view"); setPanel(false); setPinEdit(null); setLive(null); }, [file?.id]);

  const onDraw = {
    start(q, pg, meta) {
      if (mode === "erase") {
        erase.current = { page: pg, before: cur.current, any: false, aspect: meta.aspect || 1 };
        onDraw.move([q], meta);
        return;
      }
      stroke.current = { page: pg, color, pts: [[q.x, q.y]], pr: [], id: `s${Date.now().toString(36)}` };
      if (meta.pressure) stroke.current.pr.push(meta.pressure);
      setLive(makeStroke({ id: stroke.current.id, color, points: stroke.current.pts }));
    },
    move(qs, meta) {
      if (erase.current) {
        const E = erase.current;
        let n = cur.current;
        for (const q of qs) n = eraseAt(n, E.page, q.x, q.y, Math.max(0.01, (meta.px || 0.003) * 14), E.aspect).notes;
        if (n !== cur.current) { change(n, !E.any); E.any = true; }
        return;
      }
      const S = stroke.current;
      if (!S) return;
      for (const q of qs) S.pts.push([q.x, q.y]);
      if (meta.pressure) S.pr.push(meta.pressure);
      setLive(makeStroke({ id: S.id, color: S.color, points: S.pts }));
    },
    end() {
      if (erase.current) { erase.current = null; return; }
      const S = stroke.current;
      stroke.current = null;
      setLive(null);
      if (!S) return;
      const pressure = S.pr.length ? S.pr.reduce((a, b) => a + b, 0) / S.pr.length : 0;
      change(addStroke(cur.current, S.page, { id: S.id, color: S.color, points: S.pts, pressure }));
    },
    cancel() { stroke.current = null; erase.current = null; setLive(null); },
  };

  const onTapPage = (q, pg) => setPinEdit({ page: pg, pin: { x: q.x, y: q.y, text: "" }, isNew: true });
  const openPin = (pg) => (m) => { if (mode === "view") setPinEdit({ page: pg, pin: m, isNew: false }); };
  const savePin = (text) => {
    const E = pinEdit;
    if (E.isNew) change(addPin(cur.current, E.page, { ...E.pin, text }).notes);
    else if (text !== E.pin.text) change(updatePin(cur.current, E.page, E.pin.id, { text }));
    setPinEdit(null);
  };
  const deletePin = () => {
    const E = pinEdit;
    change(removePin(cur.current, E.page, E.pin.id));
    setPinEdit(null);
  };
  const clearAll = () => {
    if (!window.confirm(t("Alle Zeichnungen und Marker auf dieser Seite löschen?"))) return;
    change(clearPage(cur.current, page));
  };
  const pg = getPage(api.notes, page);

  return {
    ...api, mode, setMode, color, setColor, show, setShow, panel, setPanel, live, pinEdit, setPinEdit,
    onDraw, onTapPage, openPin, savePin, deletePin, clearAll, page, setPageNo,
    canClear: pg.strokes.length + pg.pins.length > 0,
    setTextValue: (v) => change(setText(cur.current, v), false),
  };
}
