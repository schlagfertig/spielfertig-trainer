// Journal-Umzug: Exportieren (Teilen-Menü, sonst Download + Kopieren) und Importieren (Datei oder Text einfügen).
// UX wie das Backup in Spielfertig Live. Alles bleibt auf dem Gerät - keine Netzwerk-Anfrage.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "./i18n.js";
import { loadLog, saveLog } from "./PracticeDiary.jsx";
import { loadCards, loadHw, saveCards, saveHw } from "./journalStore.js";
import { backupFileName, buildBackup, hasJournalData, mergeBackup, parseBackup, replaceBackup } from "./journalBackup.js";
import { askUnlock, isUnlocked, FREE_JOURNAL_N } from "./demo.js";
import "./TesterFeedback.css";

const current = () => ({ diary: loadLog(), homework: loadHw(), cards: loadCards() });

function download(name, json) {
  try {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch { return false; }
}

function summary(a, replaced) {
  const part = (n, one, many) => (n ? (n === 1 ? t(one) : t(many, { n })) : null);
  const list = [part(a.entries, "1 Eintrag", "{n} Einträge"), part(a.homework, "1 Hausaufgabe", "{n} Hausaufgaben"), part(a.cards, "1 Karteikarte", "{n} Karteikarten")].filter(Boolean).join(", ");
  if (replaced) return t("Ersetzt: {list}.", { list: list || "-" });
  if (!list) return a.updated ? t("{n} Einträge aktualisiert, sonst war schon alles da.", { n: a.updated }) : t("Alles schon da - nichts Neues in der Datei.");
  return t("{list} übernommen.", { list }) + (a.updated ? " " + t("{n} aktualisiert.", { n: a.updated }) : "");
}

const REASON = {
  json: "Das ist keine Schlagfertig-Journal-Datei. Nimm die Datei, die du beim Exportieren gespeichert hast.",
  app: "Das ist keine Schlagfertig-Journal-Datei. Nimm die Datei, die du beim Exportieren gespeichert hast.",
  version: "Diese Datei kommt aus einer neueren App-Version. Aktualisiere Schlagfertig und probier es nochmal.",
  empty: "In dieser Datei ist nichts drin, was du übernehmen kannst.",
};

function Dialog({ title, children, onClose }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  // An <body> hängen: die Glas-Kachel (backdrop-filter) würde „position: fixed“ sonst in sich einsperren.
  return createPortal(
    <div className="modal fb-modal" onClick={onClose}>
      <div className="modal-card fb-card jr-move-card" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="fb-title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default function JournalBackup({ onChanged }) {
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(null); // Export-Text für den Ersatz-Dialog
  const [imp, setImp] = useState(null); // { step: "pick" | "choose" | "replace", text, err, data }
  const fileRef = useRef(null);

  async function exportNow() {
    setMsg("");
    const json = JSON.stringify(buildBackup(current()), null, 2);
    const name = backupFileName();
    try {
      const file = new File([json], name, { type: "application/json" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t("Schlagfertig Journal") });
        setMsg(t("Fertig! Öffne die Datei auf deinem neuen Gerät mit „Importieren“."));
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return; // Teilen abgebrochen
    }
    download(name, json);
    setSaved(json);
  }

  function apply(data, replace) {
    const r = replace ? replaceBackup(data) : mergeBackup(current(), data);
    if (!isUnlocked()) {
      const hw = r.homework?.items || [];
      const cards = r.cards?.cards || [];
      if (hw.length > FREE_JOURNAL_N || cards.length > FREE_JOURNAL_N) {
        askUnlock();
        if (hw.length > FREE_JOURNAL_N) r.homework = { ...r.homework, items: hw.slice(0, FREE_JOURNAL_N) };
        if (cards.length > FREE_JOURNAL_N) r.cards = { ...r.cards, cards: cards.slice(0, FREE_JOURNAL_N) };
      }
    }
    saveLog(r.diary); saveHw(r.homework); saveCards(r.cards);
    setImp(null);
    setMsg(summary(r.added, replace));
    onChanged?.();
  }

  function take(text) {
    const r = parseBackup(text);
    if (!r.ok) { setImp((s) => ({ ...(s || {}), step: "pick", text, err: t(REASON[r.reason]) })); return; }
    if (!hasJournalData(current())) { apply(r.data, false); return; }
    setImp({ step: "choose", data: r.data });
  }

  function pickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => take(String(reader.result || ""));
    reader.onerror = () => setImp((s) => ({ ...(s || {}), step: "pick", err: t(REASON.json) }));
    reader.readAsText(file);
  }

  const close = () => setImp(null);
  return (
    <section className="dy-glass jr-move" aria-label={t("Journal mitnehmen")}>
      <h3>{t("Journal mitnehmen")}</h3>
      <p>{t("Neues Handy? Sichere dein Journal als Datei und hol es auf dem neuen Gerät wieder rein. Alles bleibt bei dir - nichts wird hochgeladen.")}</p>
      <div className="jr-move-btns">
        <button type="button" className="jr-move-btn" onClick={exportNow}>{t("Exportieren")}</button>
        <button type="button" className="jr-move-btn" onClick={() => { setMsg(""); setImp({ step: "pick", text: "", err: "" }); }}>{t("Importieren")}</button>
      </div>
      {msg ? <p className="jr-move-msg" role="status" aria-live="polite">{msg}</p> : null}

      {saved !== null ? (
        <Dialog title={t("Journal exportieren")} onClose={() => setSaved(null)}>
          <p className="fb-lead jr-move-lead">{t("Die Datei sollte gerade gespeichert worden sein. Sonst hier nochmal speichern oder den Text kopieren.")}</p>
          <div className="fb-actions">
            <button type="button" className="fb-btn fb-primary" onClick={() => download(backupFileName(), saved)}>{t("Datei speichern")}</button>
            <textarea className="jr-move-text" readOnly value={saved} onFocus={(e) => e.target.select()} aria-label={t("Journal als Text")} />
            <button type="button" className="fb-btn" onClick={() => {
              const done = () => setMsg(t("Kopiert! Füg den Text auf dem neuen Gerät bei „Importieren“ ein."));
              if (navigator.clipboard?.writeText) navigator.clipboard.writeText(saved).then(done, () => setMsg(t("Bitte markier den Text und kopier ihn selbst.")));
              else setMsg(t("Bitte markier den Text und kopier ihn selbst."));
              setSaved(null);
            }}>{t("Kopieren")}</button>
            <button type="button" className="fb-btn" onClick={() => setSaved(null)}>{t("Fertig")}</button>
          </div>
        </Dialog>
      ) : null}

      {imp?.step === "pick" ? (
        <Dialog title={t("Journal importieren")} onClose={close}>
          <p className="fb-lead jr-move-lead">{t("Wähl deine Journal-Datei oder füg den kopierten Text ein.")}</p>
          <div className="fb-actions">
            <button type="button" className="fb-btn fb-primary" onClick={() => fileRef.current?.click()}>{t("Datei wählen")}</button>
            <input ref={fileRef} type="file" accept=".json,application/json,text/plain" hidden onChange={pickFile} />
            <textarea className="jr-move-text" value={imp.text || ""} onChange={(e) => setImp({ ...imp, text: e.target.value, err: "" })} placeholder={t("Text hier einfügen …")} aria-label={t("Journal als Text")} />
            {imp.err ? <p className="jr-move-err" role="alert">{imp.err}</p> : null}
            <button type="button" className="fb-btn" disabled={!imp.text?.trim()} onClick={() => take(imp.text)}>{t("Übernehmen")}</button>
            <button type="button" className="fb-btn" onClick={close}>{t("Abbrechen")}</button>
          </div>
        </Dialog>
      ) : null}

      {imp?.step === "choose" ? (
        <Dialog title={t("Auf diesem Gerät ist schon ein Journal")} onClose={close}>
          <p className="fb-lead jr-move-lead">{t("Zusammenführen holt alles Neue dazu - nichts wird doppelt, nichts geht verloren.")}</p>
          <div className="fb-actions">
            <button type="button" className="fb-btn fb-primary" onClick={() => apply(imp.data, false)}>{t("Zusammenführen")}</button>
            <button type="button" className="fb-btn" onClick={() => setImp({ ...imp, step: "replace" })}>{t("Ersetzen")}</button>
            <button type="button" className="fb-btn" onClick={close}>{t("Abbrechen")}</button>
          </div>
        </Dialog>
      ) : null}

      {imp?.step === "replace" ? (
        <Dialog title={t("Wirklich ersetzen?")} onClose={close}>
          <p className="fb-lead jr-move-lead">{t("Dein Journal auf diesem Gerät wird durch die Datei ersetzt. Die Einträge, Hausaufgaben und Karteikarten hier sind dann weg.")}</p>
          <div className="fb-actions">
            <button type="button" className="fb-btn fb-gold-btn" onClick={() => apply(imp.data, true)}>{t("Ja, ersetzen")}</button>
            <button type="button" className="fb-btn" onClick={close}>{t("Abbrechen")}</button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
