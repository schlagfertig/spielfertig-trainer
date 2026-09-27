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
import { loadSession } from "./lib/session.js";
import { LogoMetronome } from "./lib/LogoMetronome.jsx";
import { getLang, setLang, t } from "./lib/i18n.js";

// Flagge der Sprache, auf die umgeschaltet wird
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

// ‽ aus dem runden Schlagfertig-Logo (public/logo.svg), für das App-Logo „Spielfertig‽ Control“
const INTERROBANG = (
  <svg className="app-logo-q" viewBox="0 -29.68 16.11 30.25" aria-hidden="true" focusable="false">
    <path d="M 8.61 -8.69 L 5 -8.69 L 4.18 -25.83 C 3.32 -25.54 2.46 -25.17 1.51 -24.64 L 1.51 -24.64 L 0 -27.59 C 1.27 -28.25 2.54 -28.78 3.81 -29.15 C 5.08 -29.52 6.52 -29.68 8.03 -29.68 L 8.03 -29.68 C 10.53 -29.68 12.54 -29.07 13.98 -27.8 C 15.41 -26.53 16.11 -24.76 16.11 -22.51 L 16.11 -22.51 C 16.11 -21.32 15.95 -20.25 15.62 -19.43 C 15.25 -18.57 14.76 -17.75 14.1 -17.02 C 13.4 -16.28 12.58 -15.5 11.56 -14.72 L 11.56 -14.72 C 10.53 -13.9 9.75 -13.12 9.3 -12.42 C 8.85 -11.73 8.61 -10.7 8.61 -9.39 L 8.61 -9.39 L 8.61 -8.69 Z M 8.36 -26.53 L 7.99 -15.42 C 8.11 -15.66 8.32 -15.91 8.57 -16.15 C 8.77 -16.36 9.06 -16.61 9.34 -16.89 L 9.34 -16.89 C 10.21 -17.63 10.82 -18.29 11.23 -18.9 C 11.64 -19.48 11.93 -20.05 12.05 -20.62 C 12.17 -21.16 12.26 -21.77 12.26 -22.47 L 12.26 -22.47 C 12.26 -23.7 11.89 -24.68 11.19 -25.38 C 10.49 -26.08 9.55 -26.45 8.36 -26.53 L 8.36 -26.53 Z M 6.93 0.57 L 6.93 0.57 C 6.11 0.57 5.45 0.33 4.92 -0.16 C 4.38 -0.66 4.14 -1.39 4.14 -2.42 L 4.14 -2.42 C 4.14 -3.44 4.42 -4.18 4.96 -4.63 C 5.49 -5.08 6.15 -5.33 7.01 -5.33 L 7.01 -5.33 C 7.79 -5.33 8.44 -5.08 8.98 -4.63 C 9.51 -4.14 9.75 -3.4 9.75 -2.42 L 9.75 -2.42 C 9.75 -1.39 9.47 -0.66 8.98 -0.16 C 8.44 0.33 7.75 0.57 6.93 0.57 Z" />
  </svg>
);

const META = {
  first: { title: "Erste Übung", help: "home" },
  rudiments: { title: "Rudiments", help: "rudiments" },
  click: { title: "Click-Trainer", help: "click" },
  pyramid: { title: "Rhythmuspyramide", help: "pyramid" },
  stick: { title: "Stick Control", help: "stick" },
  archive: { title: "Noten", help: "archive" },
  impressum: { title: "Impressum", help: "home" },
  datenschutz: { title: "Datenschutz", help: "home" },
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
          <h1 className="app-logo" aria-label="Spielfertig Control">
            <span className="app-logo-main" aria-hidden="true">Spielfertig{INTERROBANG}</span>
            <span className="app-logo-sub" aria-hidden="true">Control</span>
          </h1>
          <p className="tag">schlagfertig · {t("Zeit für guten Sound")}</p>
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
            <div className="card-title">Stick Control</div>
            <div className="card-lead">{t("nach G. L. Stone: Schwache Hand verbessern, saubere Wechsel üben, Tempo ohne Verspannungen halten.")}</div>
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
      <header className="top" style={{ zIndex: 50 }}>
        {stage && !printOpen ? (
          <button className="ghost" onClick={() => setStage(false)}>{t("Zurück")}</button>
        ) : (
          <button className="ghost" onClick={back}>{t("Zurück")}</button>
        )}
        <div className="top-title">{t(printOpen && view === "rudiments" ? "Drucken" : meta.title)}</div>
        <div className="top-right">
          {view === "archive" && !printOpen && (
            <button className={sheetOpen ? "ghost on" : "ghost"} onClick={() => setSheetOpen((v) => !v)}>{t("Blatt")}</button>
          )}
          {view === "rudiments" && !stage && !printOpen && (
            <button className="ghost" onClick={() => setPrintOpen(true)}>{t("Drucken")}</button>
          )}
          {view === "rudiments" && !printOpen && (
            <button
              className={stage ? "ghost on" : "ghost"}
              title={t("Notation groß, weniger Bedienelemente.")}
              aria-label={t(stage ? "Übepad aus" : "Übepad")}
              onClick={() => setStage((v) => !v)}
            >{t(stage ? "Pad aus" : "Übepad")}</button>
          )}
          {!stage && !printOpen && view !== "first" && view !== "impressum" && view !== "datenschutz" && <Help topic={meta.help} />}
        </div>
      </header>
      <main className="main">
        {view === "first" ? <FirstLesson onHome={goHome} onOpen={open} />
          : view === "impressum" ? <Legal topic="impressum" onOpen={open} />
          : view === "datenschutz" ? <Legal topic="datenschutz" onOpen={open} />
          : view === "click" ? <ClickTrainer />
          : view === "pyramid" ? <PyramidTrainer />
          : view === "stick" ? <StickControl />
          : view === "archive" ? <Archive />
          : <RudimentTrainer printOpen={printOpen} onPrintClose={() => setPrintOpen(false)} stage={stage} />}
      </main>
      {sheetOpen && view === "archive" ? <Archive overlay onClose={() => setSheetOpen(false)} /> : null}
    </div>
  );
}
