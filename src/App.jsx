import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { loadSession } from "./lib/session.js";
import { LogoMetronome } from "./lib/LogoMetronome.jsx";
import { SocialLinks } from "./lib/Social.jsx";
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
  // Hand Control startet immer in der Fokus-Ansicht (aktuelle Übung groß, nächste als Vorschau).
  // Der frühere Schalter „Fokus + Preview“ ist weg – seine gemerkte Einstellung (sf.v1.stick) einmalig aufräumen.
  useEffect(() => {
    try { localStorage.removeItem("sf.v1.stick"); } catch { /* Speicher nicht verfügbar */ }
  }, []);
  const [lang, setLangState] = useState(getLang);
  const viewRef = useRef(view);
  viewRef.current = view;
  // Scroll-Position der Startseite (beim Verlassen gemerkt, bei der Rückkehr wiederhergestellt).
  const homeScrollRef = useRef(0);
  const firstDone = !!loadSession("firstLesson", {}).done;

  function switchLang() {
    const next = lang === "de" ? "en" : "de";
    setLang(next);
    setLangState(next);
  }

  function rememberHomeScroll() {
    if (viewRef.current === "home") homeScrollRef.current = window.scrollY || 0;
  }

  function goHome() {
    setPrintOpen(false);
    setStage(false);
    setView("home");
    try {
      if (window.location.pathname !== "/") {
        window.history.pushState({ sf: "home" }, "", "/");
      }
    } catch { /* ignore */ }
  }

  function back() {
    if (printOpen) { setPrintOpen(false); return; }
    if (stage) { setStage(false); return; }
    if (window.history.state?.sf) window.history.back();
    else goHome();
  }

  function open(next) {
    rememberHomeScroll();
    setPrintOpen(false);
    setStage(false);
    setView(next);
    try {
      const path = next === "impressum" ? "/impressum"
        : next === "datenschutz" ? "/datenschutz"
        : "/";
      window.history.pushState({ sf: next }, "", path);
    } catch { /* ignore */ }
  }

  // Ansichtswechsel ist kein Seitenwechsel: ohne Zurücksetzen erbt die neue Ansicht die
  // Scroll-Position der Startseite (z. B. Rudiments öffnet halb gescrollt, Zurück-Knopf weg).
  // Jede Ansicht beginnt oben; die Startseite kehrt dorthin zurück, wo man sie verlassen hat.
  // Läuft als Layout-Effekt vor den normalen Effekten der Ansicht – deren eigenes Scrollen
  // (z. B. Hand Control: aktuelle Übung unter die Kopfzeile) gewinnt also weiterhin.
  useLayoutEffect(() => {
    try {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
      window.scrollTo(0, view === "home" ? homeScrollRef.current : 0);
    } catch { /* ignore */ }
  }, [view]);

  useEffect(() => {
    function onPop() {
      if (printOpen) { setPrintOpen(false); return; }
      const next = viewFromPath();
      rememberHomeScroll();
      setPrintOpen(false);
      setStage(false);
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
      // offene Dialoge (z. B. Noten-Vollbild, Vorschau) haben eigene Gesten – kein Zurück-Wischen
      if (document.querySelector('[aria-modal="true"]')) return;
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
  }, [view, stage, printOpen]);

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
          <div className="card-lead">{t("Einfach loslegen: eine Minute im Click spielen. Ganz ohne Vorwissen.")}</div>
          <div className="card-go">Start</div>
        </button>
        <div className="cards">
          <button className="card" onClick={() => open("rudiments")}>
            <div className="card-kicker">{t("Üben")}</div>
            <div className="card-title">Rudiments</div>
            <div className="card-lead">{t("40 Grundlagen für Technik, Kontrolle und Timing.")}<br />{t("Mit Notation, Click und Tempo.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card" onClick={() => open("click")}>
            <div className="card-kicker">Tempo</div>
            <div className="card-title">{t("Click-Trainer")}</div>
            <div className="card-lead">{t("Dein Tempo, dein Groove. Tempo sicher halten oder Schritt für Schritt steigern.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card" onClick={() => open("pyramid")}>
            <div className="card-kicker">Subdivision</div>
            <div className="card-title">{t("Rhythmuspyramide")}</div>
            <div className="card-lead">{t("4tel bis 32tel: Puls festigen und sauber zwischen den Unterteilungen wechseln.")}</div>
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
            <div className="card-lead">{t("Deine Noten immer dabei. Fotos und PDFs speichern, beim Üben aufschlagen und zoomen.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
        </div>
        <footer className="foot">
          <div className="foot-copy">Copyright by Thomas Schuster</div>
          <SocialLinks />
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
            {view === "rudiments" && !stage && !printOpen && (
              <button className="ghost" onClick={() => setPrintOpen(true)}>{t("Drucken")}</button>
            )}
            {/* Fokus-Mode (früher „Übepad“): gleicher Name in beiden Zuständen, an = türkis gefüllt + aria-pressed */}
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
          : view === "stick" ? <StickControl />
          : view === "archive" ? <Archive />
          : <RudimentTrainer printOpen={printOpen} onPrintClose={() => setPrintOpen(false)} stage={stage} />}
      </main>
    </div>
  );
}
