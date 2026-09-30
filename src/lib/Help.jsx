import { useState } from "react";
import { createPortal } from "react-dom";
import { loadSession, saveSession } from "./session.js";
import { t } from "./i18n.js";
import { HELP } from "./helpCopy.js";
import { DialHint } from "./DialHint.jsx";
import { DIAL_TOPICS as DIAL_TOPIC_LIST, dialHintSeen, markDialHintSeen } from "./dialHintOnce.js";

const DIAL_TOPICS = new Set(DIAL_TOPIC_LIST);

function markSeen(topic) {
  const cur = loadSession("tour", {});
  if (cur[topic]) return;
  saveSession("tour", { ...cur, [topic]: true });
}

export function Help({ topic = "home", onFirstClose }) {
  const first = topic !== "home" && !loadSession("tour", {})[topic];
  const [open, setOpen] = useState(first);
  const [dial, setDial] = useState(false);
  const rows = HELP[topic] || HELP.home;

  function close() {
    const wasFirst = first;
    // Vor markSeen prüfen, sonst zählt die Migration den aktuellen Bereich schon mit.
    const showDial = wasFirst && DIAL_TOPICS.has(topic) && !dialHintSeen();
    markSeen(topic);
    setOpen(false);
    if (showDial) {
      markDialHintSeen();
      setDial(true);
    }
    if (wasFirst) onFirstClose?.();
  }

  const sheet = open ? createPortal(
    <div className="modal help-modal" onClick={close} role="dialog" aria-modal="true">
      <div className="modal-card help-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">{t(first ? "Kurz anschauen" : "Kurz")}</div>
        {first ? (
          <p className="help-lead">
            {t("Einmalig beim ersten Öffnen — danach jederzeit über ?")}
          </p>
        ) : null}
        <ul className="help-list">
          {rows.map(([k, v]) => (
            <li key={k}><strong>{t(k)}</strong> {t(v)}</li>
          ))}
        </ul>
        <button className="play" onClick={close} style={{ width: "100%" }}>
          {t(first ? "Verstanden" : "Schließen")}
        </button>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button type="button" className="help-dot" onClick={() => setOpen(true)} aria-label={t("Kurzhilfe")}>?</button>
      {sheet}
      {dial ? <DialHint onDone={() => setDial(false)} /> : null}
    </>
  );
}
