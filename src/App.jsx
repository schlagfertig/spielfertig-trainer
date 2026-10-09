import { useEffect, useLayoutEffect, useRef, useState } from "react";
import RudimentTrainer from "./embedded/RudimentTrainer.jsx";
import ClickTrainer from "./embedded/ClickTrainer.jsx";
import PyramidTrainer from "./embedded/PyramidTrainer.jsx";
import StickControl from "./embedded/StickControl.jsx";
import Lexicon from "./embedded/Lexicon.jsx";
import Archive from "./embedded/Archive.jsx";
import { PracticeClip } from "./lib/PracticeClip.jsx";
import RhythmArchive, { lockGrooveLandscape, unlockGrooveLandscape } from "./embedded/RhythmArchive.jsx";
import { Help } from "./lib/Help.jsx";
import { Welcome } from "./lib/Welcome.jsx";
import FirstLesson, { loadBeginnerDone } from "./lib/FirstLesson.jsx";
import NoStick from "./lib/NoStick.jsx";
import { STEPS as BEGIN_STEPS, nextIndex as beginNext } from "./lib/beginner.js";
import Today from "./lib/Today.jsx";
import { FIRST_SKIP_KEY, hideFirstToday, isFirstHidden } from "./lib/firstSkip.js";
import Legal from "./lib/Legal.jsx";
import News, { NewsButton } from "./lib/News.jsx";
import { loadSession, saveSession } from "./lib/session.js";
import { LogoMetronome } from "./lib/LogoMetronome.jsx";
import { SocialLinks } from "./lib/Social.jsx";
import { TileIcon } from "./lib/HomeIcons.jsx";
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
  first: { title: "Einstieg", help: "home" },
  nostick: { title: "No-Stick-Challenge", help: "home" },
  rudiments: { title: "Rudiments", help: "rudiments" },
  click: { title: "Click-Trainer", help: "click" },
  pyramid: { title: "Rhythmuspyramide", help: "pyramid" },
  stick: { title: "Hand Control", help: "stick" },
  archive: { title: "Noten", help: "archive" },
  rhythm: { title: "Meine Grooves", help: "grooves" },
  lexicon: { title: "Lexikon", help: "home" },
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
  // Startwerte für ein Modul, wenn es aus der „Heute“-Karte geöffnet wird (sonst null = eigene Werte).
  const [preset, setPreset] = useState(null);
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
  // Einstieg (Erste Übung + Folgeübungen): nächster offener Schritt, -1 = alle geschafft.
  const beginDone = loadBeginnerDone();
  const beginIdx = beginNext(beginDone);
  const beginStep = BEGIN_STEPS[beginIdx];
  // Einmaliger Hinweis auf „Neuigkeiten“ – erst nachdem die Begrüßung (Welcome) geschlossen ist.
  const [welcomeOpen, setWelcomeOpen] = useState(() => !loadSession("welcomeSeen", {}).seen);
  // „Nicht heute“: Karte „Erste Übung starten“ bis Tagesende ausblenden (gespeichert: nur der Tag).
  // Der Tag wird bei jedem Rendern neu verglichen – nach Mitternacht ist die Karte wieder da.
  const [firstSkip, setFirstSkip] = useState(() => loadSession(FIRST_SKIP_KEY, {}));
  const [firstLeaving, setFirstLeaving] = useState(false);
  const [, setTick] = useState(0);
  const firstHidden = isFirstHidden(firstSkip);
  useEffect(() => {
    // App kommt nach Stunden aus dem Hintergrund zurück: Tag neu prüfen.
    const onVis = () => { if (!document.hidden) setTick((n) => n + 1); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function skipFirstToday() {
    if (firstLeaving) return;
    const done = () => {
      const next = hideFirstToday();
      saveSession(FIRST_SKIP_KEY, next);
      setFirstSkip(next);
      setFirstLeaving(false);
      // Fokus nicht ins Leere fallen lassen: zur „Heute“-Karte (nächster Vorschlag).
      window.requestAnimationFrame(() => document.querySelector(".today-seg .on")?.focus({ preventScroll: true }));
    };
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { done(); return; }
    // Karte erst weich zusammenklappen (Höhe, Abstand, Deckkraft), dann entfernen – kein Sprung.
    setFirstLeaving(true);
    window.setTimeout(done, 300);
  }

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

  function open(next, nextPreset = null) {
    rememberHomeScroll();
    setPreset(nextPreset && typeof nextPreset === "object" && !("nativeEvent" in nextPreset) ? nextPreset : null);
    setPrintOpen(false);
    setStage(false);
    if (next === "rhythm") lockGrooveLandscape();
    else unlockGrooveLandscape();
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

  // Startseite: Scroll-Richtung verfolgen. Runter = Sprache/„!“/„?“ ausblenden, hoch oder ganz oben = wieder zeigen.
  // „scrolled“ sperrt außerdem das Logo-Metronom (Easter Egg), damit es beim Scrollen nicht aus Versehen aufgeht.
  const [helpHidden, setHelpHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (view !== "home") { setHelpHidden(false); setScrolled(false); return undefined; }
    let last = window.scrollY || 0;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY || 0);
      setScrolled(y > 24);
      if (y < 40) setHelpHidden(false);
      else if (y > last + 6) setHelpHidden(true);
      else if (y < last - 6) setHelpHidden(false);
      else return; // kleine Zitterbewegungen ignorieren, Bezugspunkt behalten
      last = y;
    };
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) window.cancelAnimationFrame(raf); };
  }, [view]);

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
      <div className={scrolled ? "page home is-scrolled" : "page home"}>
        <div className={helpHidden ? "home-help is-hidden" : "home-help"}>
          <button type="button" className="help-dot lang-flag" onClick={switchLang} aria-label={lang === "de" ? "Switch to English" : "Auf Deutsch umschalten"}>{lang === "de" ? FLAG_EN : FLAG_DE}</button>
          <div className="home-help-col">
            <Help topic="home" />
            <NewsButton />
          </div>
        </div>
        <header className="hero">
          <LogoMetronome locked={scrolled} />
          {/* Das runde Logo zeigt schon „schlagfertig‽ · Zeit für guten Sound“ – darunter der Untertitel. */}
          <h1 className="app-logo" aria-label={`Schlagfertig‽ – ${t("Drums lernen – Schlag für Schlag")}`}>
            <span className="app-logo-sub" aria-hidden="true">{t("Drums lernen – Schlag für Schlag")}</span>
          </h1>
          {false && <p className="app-price" style={{ margin: "6px 0 0", color: "#5cc8b8", font: "800 15px Figtree, sans-serif", letterSpacing: "0.02em" }}>12,99 € einmalig</p>}
        </header>
        {firstHidden ? null : (
          <div className={firstLeaving ? "first-wrap leaving" : "first-wrap"}>
            <div className="first-inner">
              <button className="card has-icon" style={{ width: "100%", borderColor: "#5cc8b8" }} onClick={() => open("first")}>
                <TileIcon name="first" />
                <div className="card-kicker">
                  {beginIdx < 0 ? t("Nochmal")
                    : `${t(beginIdx === 0 ? "Loslegen" : "Weiter")} · ${t("Schritt {n} von {total}", { n: beginIdx + 1, total: BEGIN_STEPS.length })}`}
                </div>
                <div className="card-title">{beginIdx < 0 ? t("Einstieg wiederholen") : beginIdx === 0 ? t("Erste Übung starten") : t(beginStep.title)}</div>
                <div className="card-lead">{beginIdx < 0 ? t("Alle 5 Schritte geschafft – such dir eine Übung aus und spiel sie nochmal.") : t(beginStep.lead)}</div>
                <div className="bg-progress is-card" aria-hidden="true">
                  {BEGIN_STEPS.map((x, i) => <span key={x.id} className={`${beginDone.has(x.id) ? "is-done" : ""}${i === beginIdx ? " is-cur" : ""}`} />)}
                </div>
                <div className="card-go">Start</div>
              </button>
              {/* eigener Knopf neben (nicht in) der Karte – Knöpfe dürfen nicht verschachtelt sein */}
              <button type="button" className="first-skip" onClick={skipFirstToday} aria-label={t("Erste Übung für heute ausblenden")}>{t("Nicht heute")}</button>
              {/* Bonus (zählt nicht zum Fortschritt): kleiner Link unter der Einstieg-Karte, verschwindet mit „Nicht heute“ */}
              <button type="button" className="ns-link" onClick={() => open("nostick")}>
                <span aria-hidden="true">🥄</span> {t("Bonus: No-Stick-Challenge")} <span className="ns-link-go" aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        )}
        <Today onOpen={open} />
        <div className="cards">
          <button className="card has-icon" onClick={() => open("rudiments")}>
            <TileIcon name="rudiments" />
            <div className="card-kicker">{t("Üben")}</div>
            <div className="card-title">Rudiments</div>
            <div className="card-lead">{t("Meistere 40 Grundlagen für Technik, Kontrolle und Timing.")}<br />{t("Mit Notation, Click und Tempo.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => open("click")}>
            <TileIcon name="click" />
            <div className="card-kicker">Tempo</div>
            <div className="card-title">{t("Click-Trainer")}</div>
            <div className="card-lead">{t("Dein Tempo, dein Groove: Halte es sicher oder steigere es Schritt für Schritt.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => open("pyramid")}>
            <TileIcon name="pyramid" />
            <div className="card-kicker">Subdivision</div>
            <div className="card-title">{t("Rhythmuspyramide")}</div>
            <div className="card-lead">{t("Von 4teln bis 32teln: Festige deinen Puls und wechsle sauber zwischen den Unterteilungen.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => open("stick")}>
            <TileIcon name="stick" />
            <div className="card-kicker">{t("Technik")}</div>
            <div className="card-title">{t("Hand Control")}</div>
            <div className="card-lead">{t("Stärke deine schwache Hand, übe saubere Wechsel und halte das Tempo ganz locker.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => open("lexicon")}>
            <TileIcon name="lexicon" />
            <div className="card-kicker">{t("Nachschlagen")}</div>
            <div className="card-title">{t("Lexikon")}</div>
            <div className="card-lead">{t("Downbeat, Flam, Groove: Schlag nach, was dahintersteckt – von A bis Z.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" type="button" onClick={() => open("rhythm")}>
            <TileIcon name="rhythm" />
            <div className="card-kicker">{t("Groove")}</div>
            <div className="card-title">{t("Meine Grooves")}</div>
            <div className="card-lead">{t("Bau deinen eigenen Groove, gib ihm einen Namen und üb ihn mit dem SpinDial, bis er sitzt.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => open("archive")}>
            <TileIcon name="archive" />
            <div className="card-kicker">{t("Eigene Blätter")}</div>
            <div className="card-title">{t("Noten")}</div>
            <div className="card-lead">{t("Hab deine Noten immer dabei: Speichere Fotos und PDFs, schlag sie beim Üben auf und zoom hinein.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
        </div>
        <footer className="foot">
          <div className="foot-copy">Copyright by Thomas Schuster</div>
          <div className="foot-copy">Version 1.0.2</div>
          <SocialLinks />
          <div className="foot-links">
            <button type="button" className="foot-link" onClick={() => open("impressum")}>{t("Impressum")}</button>
            <button type="button" className="foot-link" onClick={() => open("datenschutz")}>{t("Datenschutz")}</button>
          </div>
        </footer>
        <Welcome onClose={() => setWelcomeOpen(false)} />
      </div>
    );
  }

  const meta = META[view] || META.rudiments;
  return (
    <div className={`page tool view-${view}${stage ? " stage" : ""}`}>
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
            {!stage && !printOpen && view !== "first" && view !== "nostick" && view !== "impressum" && view !== "datenschutz" && view !== "news" && <Help topic={meta.help} />}
          </div>
        </div>
        <div className="top-title">{t(printOpen && view === "rudiments" ? "Drucken" : meta.title)}</div>
      </header>
      <main className="main">
        {view === "first" ? <FirstLesson key={preset?.step || "next"} onHome={goHome} onOpen={open} preset={preset} />
          : view === "nostick" ? <NoStick onHome={goHome} onOpen={open} />
          : view === "impressum" ? <Legal topic="impressum" onOpen={open} />
          : view === "datenschutz" ? <Legal topic="datenschutz" onOpen={open} />
          : view === "news" ? <News />
          : view === "click" ? <ClickTrainer preset={preset} />
          : view === "pyramid" ? <PyramidTrainer preset={preset} />
          : view === "stick" ? <StickControl preset={preset} />
          : view === "archive" ? <Archive />
          : view === "lexicon" ? <Lexicon />
          : view === "rhythm" ? <RhythmArchive />
          : <RudimentTrainer printOpen={printOpen} onPrintClose={() => setPrintOpen(false)} stage={stage} preset={preset} />}
      {["rudiments", "click", "pyramid", "stick", "rhythm"].includes(view) && !printOpen ? <PracticeClip title={t(meta.title)} view={view} /> : null}
      </main>
    </div>
  );
}
