import { useEffect, useRef, useState } from "react";
import RudimentTrainer from "./embedded/RudimentTrainer.jsx";
import ClickTrainer from "./embedded/ClickTrainer.jsx";
import PyramidTrainer from "./embedded/PyramidTrainer.jsx";
import StickControl from "./embedded/StickControl.jsx";
import Archive from "./embedded/Archive.jsx";
import { Help } from "./lib/Help.jsx";
import { Welcome } from "./lib/Welcome.jsx";
import FirstLesson from "./lib/FirstLesson.jsx";
import Legal from "./lib/Legal.jsx";
import News, { hasUnseenNews } from "./lib/News.jsx";
import { loadSession, saveSession } from "./lib/session.js";
import { LogoMetronome } from "./lib/LogoMetronome.jsx";
import { getLang, setLang, t } from "./lib/i18n.js";

const FLAG_EN = (
  <svg viewBox="0 0 60 30" width="30" height="30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <clipPath id="uj-t"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z" /></clipPath>
    <path d="M0,0v30h60v-30z" fill="#012169" />
    <path d="M0,0L60,30M60,0L0,30" stroke="#fff" strokeWidth="6" />
    <path d="M0,0L60,30M60,0L0,30" clipPath="url(#uj-t)" stroke="#C8102E" strokeWidth="4" />
    <path d="M30,0v30M0,15h60" stroke="#fff" strokeWidth="10" />
    <path d="M30,0v30M0,15h60" stroke="#C8102E" strokeWidth="6" />
  </svg>
);
const FLAG_DE = (
  <svg viewBox="0 0 5 3" width="30" height="30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path d="M0,0h5v1h-5z" fill="#000" />
    <path d="M0,1h5v1h-5z" fill="#DD0000" />
    <path d="M0,2h5v1h-5z" fill="#FFCE00" />
  </svg>
);

const META = {
  first: { title: "Erste Übung", help: "home" },
  rudiments: { title: "Rudiments", help: "rudiments" },
  click: { title: "Click-Trainer", help: "click" },
  pyramid: { title: "Rhythmuspyramide", help: "pyramid" },
  stick: { title: "Hand Control", help: "stick" },
  archive: { title: "Noten", help: "archive" },
  impressum: { title: "Impressum", help: "home" },
  datenschutz: { title: "Datenschutz", help: "home" },
  news: { title: "Neuigkeiten", help: "home" },
};

function viewFromPath() {
  try {
    const p = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    if (p === "/impressum") return "impressum";
    if (p === "/datenschutz") return "datenschutz";
  } catch { /* ignore */ }
  return "home";
}

export default function App() {
  const [view, setView] = useState(viewFromPath);
  const [printOpen, setPrintOpen] = useState(false);
  const [stage, setStage] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // WA-21: Hand Control „Fokus + Preview“ (optional, gemerkt; Standard = große Ansicht wie bisher)
  const [handFocus, setHandFocus] = useState(() => !!loadSession("stick", {}).focus);
  function toggleHandFocus() {
    setHandFocus((v) => {
      const next = !v;
      saveSession("stick", { focus: next });
      return next;
    });
  }
  const [lang, setLangState] = useState(getLang);
  const viewRef = useRef(view);
  viewRef.current = view;
  const firstDone = !!loadSession("firstLesson", {}).done;

  function switchLang() {
    const next = lang === "de" ? "en" : "de";
    setLang(next);
    setLangState(next);
  }

  function goHome() {
    setPrintOpen(false);
    setStage(false);
    setSheetOpen(false);
    setView("home");
    try {
      if (window.location.pathname !== "/") {
        window.history.pushState({ sf: "home" }, "", "/");
      }
    } catch { /* ignore */ }
  }

  function back() {
    if (printOpen) { setPrintOpen(false); return; }
    if (sheetOpen) { setSheetOpen(false); return; }
    if (stage) { setStage(false); return; }
    if (window.history.state?.sf) window.history.back();
    else goHome();
  }

  function open(next) {
    setPrintOpen(false);
    setStage(false);
    setSheetOpen(false);
    setView(next);
    try {
      const path = next === "impressum" ? "/impressum"
        : next === "datenschutz" ? "/datenschutz"
        : "/";
      window.history.pushState({ sf: next }, "", path);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    function onPop() {
      if (printOpen) { setPrintOpen(false); return; }
      const next = viewFromPath();
      setPrintOpen(false);
      setStage(false);
      setSheetOpen(false);
      setView(next);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [printOpen]);

  useEffect(() => {
    if (view === "home") return undefined;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    function onStart(e) {
      const t = e.changedTouches?.[0];
      if (!t) return;
      if (t.clientX > 32) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    }
    function onMove(e) {
      if (!tracking) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 72 && dy < 56) {
        tracking = false;
        back();
      }
    }
    function onEnd() {
      tracking = false;
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [view, stage, sheetOpen, printOpen]);

  if (view === "home") {
    return (
      <div className="page home">
        <div className="home-help">
          <button type="button" className="help-dot lang-flag" onClick={switchLang} aria-label={lang === "de" ? "Switch to English" : "Auf Deutsch umschalten"}>{lang === "de" ? FLAG_EN : FLAG_DE}</button>
          <Help topic="home" />
        </div>
        <header className="hero">
          <LogoMetronome />
          {/* Das runde Logo zeigt schon „schlagfertig‽ · Zeit für guten Sound“ – darunter nur „Control“. */}
          <h1 className="app-logo" aria-label="Schlagfertig Control">
            <span className="app-logo-sub" aria-hidden="true">Control</span>
          </h1>
        </header>
        <button className="card" style={{ width: "100%", borderColor: "#5cc8b8", marginTop: 8 }} onClick={() => open("first")}>
          <div className="card-kicker">{t(firstDone ? "Nochmal" : "Loslegen")}</div>
          <div className="card-title">{t("Erste Übung starten")}</div>
          <div className="card-lead">{t("Eine Minute mitklicken. Kein Fachwort nötig.")}</div>
          <div className="card-go">Start</div>
        </button>
        <div className="cards">
          <button className="card" onClick={() => open("rudiments")}>
            <div className="card-kicker">{t("Üben")}</div>
            <div className="card-title">Rudiments</div>
            <div className="card-lead">{t("40 PAS-Rudiments. Notation, Click, Tempo.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card" onClick={() => open("click")}>
            <div className="card-kicker">Tempo</div>
            <div className="card-title">{t("Click-Trainer")}</div>
            <div className="card-lead">{t("Starttempo wählen. Tempo halten oder automatisch steigern.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card" onClick={() => open("pyramid")}>
            <div className="card-kicker">Subdivision</div>
            <div className="card-title">{t("Rhythmuspyramide")}</div>
            <div className="card-lead">{t("4tel bis 32tel: Puls festigen, sauber zwischen Unterteilungen wechseln, Tempo trotz Dichte halten.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card" onClick={() => open("stick")}>
            <div className="card-kicker">{t("Technik")}</div>
            <div className="card-title">{t("Hand Control")}</div>
            <div className="card-lead">{t("Schwache Hand verbessern, saubere Wechsel üben, Tempo ohne Verspannungen halten.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card" onClick={() => open("archive")}>
            <div className="card-kicker">{t("Eigene Blätter")}</div>
            <div className="card-title">{t("Noten")}</div>
            <div className="card-lead">{t("Fotos und PDFs lokal ablegen und währenddessen aufschlagen.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
        </div>
        <footer className="foot">
          <div>Thomas Schuster · schlagfertig</div>
          <div className="foot-links foot-news">
            <button type="button" className="foot-link" onClick={() => open("news")}>
              {t("Neuigkeiten")}
              {hasUnseenNews() && <span className="news-dot" role="img" aria-label={t("neu")} />}
            </button>
          </div>
          <div className="foot-links">
            <button type="button" className="foot-link" onClick={() => open("impressum")}>{t("Impressum")}</button>
            <button type="button" className="foot-link" onClick={() => open("datenschutz")}>{t("Datenschutz")}</button>
          </div>
        </footer>
        <Welcome />
      </div>
    );
  }

  const meta = META[view] || META.rudiments;
  return (
    <div className={stage ? "page tool stage" : "page tool"}>
      <header className="top">
        <div className="top-row">
          {stage && !printOpen ? (
            <button className="ghost" onClick={() => setStage(false)}>{t("Zurück")}</button>
          ) : (
            <button className="ghost" onClick={back}>{t("Zurück")}</button>
          )}
          <div className="top-right">
            {view === "archive" && !printOpen && (
              <button className={sheetOpen ? "ghost on" : "ghost"} onClick={() => setSheetOpen((v) => !v)}>{t("Blatt")}</button>
            )}
            {view === "rudiments" && !stage && !printOpen && (
              <button className="ghost" onClick={() => setPrintOpen(true)}>{t("Drucken")}</button>
            )}
            {view === "stick" && (
              <button
                type="button"
                className={handFocus ? "ghost on" : "ghost"}
                aria-pressed={handFocus}
                title={t("Große aktuelle Übung, kleine Vorschau der nächsten.")}
                onClick={toggleHandFocus}
              >{t("Fokus + Preview")}</button>
            )}
            {/* Fokus-Mode (früher „Übepad“): gleicher Name in beiden Zuständen, an = türkis gefüllt + aria-pressed – wie „Fokus + Preview“ in Hand Control */}
            {view === "rudiments" && !printOpen && (
              <button
                type="button"
                className={stage ? "ghost on" : "ghost"}
                aria-pressed={stage}
                title={t("Notation groß, weniger Bedienelemente.")}
                onClick={() => setStage((v) => !v)}
              >{t("Fokus-Mode")}</button>
            )}
            {!stage && !printOpen && view !== "first" && view !== "impressum" && view !== "datenschutz" && view !== "news" && <Help topic={meta.help} />}
          </div>
        </div>
        <div className="top-title">{t(printOpen && view === "rudiments" ? "Drucken" : meta.title)}</div>
      </header>
      <main className="main">
        {view === "first" ? <FirstLesson onHome={goHome} onOpen={open} />
          : view === "impressum" ? <Legal topic="impressum" onOpen={open} />
          : view === "datenschutz" ? <Legal topic="datenschutz" onOpen={open} />
          : view === "news" ? <News />
          : view === "click" ? <ClickTrainer />
          : view === "pyramid" ? <PyramidTrainer />
          : view === "stick" ? <StickControl focusMode={handFocus} />
          : view === "archive" ? <Archive />
          : <RudimentTrainer printOpen={printOpen} onPrintClose={() => setPrintOpen(false)} stage={stage} />}
      </main>
      {sheetOpen && view === "archive" ? <Archive overlay onClose={() => setSheetOpen(false)} /> : null}
    </div>
  );
}
