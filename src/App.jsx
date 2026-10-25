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
import EtudeDice from "./lib/EtudeDice.jsx";
import PracticeDiary, { DiaryToast } from "./lib/PracticeDiary.jsx";
import Journal, { JournalBar } from "./lib/Journal.jsx";
import { journalOn } from "./lib/journalStore.js";
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
import { holdWake } from "./lib/wake.js";
import TesterFeedback, { FeedbackLink } from "./lib/TesterFeedback.jsx";
import WhatsNew from "./lib/WhatsNew.jsx";
import { startModal } from "./lib/startModal.js";
import { APP_VERSION } from "./lib/version.js";
import { canOpen, isUnlocked, setUnlocked, DEMO_PRICE, unlockCodeOk, PAYWALL_EVENT } from "./lib/demo.js";
import { AudioOffsetControl } from "./lib/AudioOffsetControl.jsx";

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
  dice: { title: "Rudiment-Würfel", help: "dice" },
  diary: { title: "Übe-Tagebuch", help: "diary" },
  rudiments: { title: "Rudiments", help: "rudiments" },
  click: { title: "Click-Trainer", help: "click" },
  pyramid: { title: "Rhythmuspyramide", help: "pyramid" },
  stick: { title: "Hand Control", help: "stick" },
  archive: { title: "Noten", help: "archive" },
  rhythm: { title: "Eigene Grooves", help: "grooves" },
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
  // Journal für alle: „Übe-Tagebuch“ ist jetzt das Journal mit Hausaufgaben und Karteikasten.
  const journal = useRef(journalOn()).current;
  useEffect(() => {
    const practice = ["rudiments", "click", "pyramid", "stick", "rhythm", "first", "nostick", "dice"].includes(view);
    if (!practice) return undefined;
    return holdWake();
  }, [view]);
  const [printOpen, setPrintOpen] = useState(false);
  const [stage, setStage] = useState(false);
  const [unlocked, setUnlockedState] = useState(isUnlocked);
  const [paywall, setPaywall] = useState(false);
  useEffect(() => {
    const onPay = () => setPaywall(true);
    window.addEventListener(PAYWALL_EVENT, onPay);
    return () => window.removeEventListener(PAYWALL_EVENT, onPay);
  }, []);
  // Startwerte für ein Modul, wenn es aus der „Heute“-Karte geöffnet wird (sonst null = eigene Werte).
  const [preset, setPreset] = useState(null);
  // Hand Control startet immer in der Fokus-Ansicht (aktuelle Übung groß, nächste als Vorschau).
  // Der frühere Schalter „Fokus + Preview“ ist weg - seine gemerkte Einstellung (sf.v1.stick) einmalig aufräumen.
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
  // Einmaliger Hinweis auf „Neuigkeiten“ - erst nachdem die Begrüßung (Welcome) geschlossen ist.
  const [welcomeOpen, setWelcomeOpen] = useState(() => !loadSession("welcomeSeen", {}).seen);
  // „Nicht heute“: Karte „Erste Übung starten“ bis Tagesende ausblenden (gespeichert: nur der Tag).
  // Der Tag wird bei jedem Rendern neu verglichen - nach Mitternacht ist die Karte wieder da.
  // Höchstens ein Start-Popup pro App-Start (Erfolg > Test-Feedback-Frage > „Neu in Schlagfertig“), nur beim Öffnen
  // auf der Startseite nach der Begrüßung - nie während oder nach einer Übung (startModal.js).
  const openedOnHome = useRef(view === "home");
  if (view !== "home") openedOnHome.current = false;
  const [startPick, setStartPick] = useState(null);
  const startPicked = useRef(false);
  useEffect(() => {
    if (view !== "home" || welcomeOpen || startPicked.current) return;
    startPicked.current = true;
    setStartPick(startModal({ onHome: openedOnHome.current }));
  }, [view, welcomeOpen]);
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
    // Karte erst weich zusammenklappen (Höhe, Abstand, Deckkraft), dann entfernen - kein Sprung.
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
    if (!canOpen(next)) { setPaywall(true); return; }
    rememberHomeScroll();
    const preset = nextPreset && typeof nextPreset === "object" && !("nativeEvent" in nextPreset) ? nextPreset : null;
    setPreset(preset);
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
  // Läuft als Layout-Effekt vor den normalen Effekten der Ansicht - deren eigenes Scrollen
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
      // offene Dialoge (z. B. Noten-Vollbild, Vorschau) haben eigene Gesten - kein Zurück-Wischen
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

  function go(next) {
    if (!canOpen(next)) { setPaywall(true); return; }
    open(next);
  }
  function cta(next) {
    return canOpen(next) ? t("Öffnen") : t("Volle App");
  }

  if (view === "home") {
    return (
      <div className={scrolled ? "page home is-scrolled" : "page home"}>
      {paywall && (
        <DemoPaywall
          onClose={() => setPaywall(false)}
          onUnlock={() => { setUnlocked(true); setUnlockedState(true); setPaywall(false); }}
        />
      )}
        <div className={helpHidden ? "home-help is-hidden" : "home-help"}>
          <button type="button" className="help-dot lang-flag" onClick={switchLang} aria-label={lang === "de" ? "Switch to English" : "Auf Deutsch umschalten"}>{lang === "de" ? FLAG_EN : FLAG_DE}</button>
          <div className="home-help-col">
            <Help topic="home" />
            <NewsButton />
          </div>
        </div>
        <header className="hero">
          <LogoMetronome locked={scrolled} />
          {/* Das runde Logo zeigt schon „schlagfertig‽ · Zeit für guten Sound“ - darunter der Untertitel. */}
          <h1 className="app-logo" aria-label={`Schlagfertig‽ - ${t("Drums lernen - Schlag für Schlag")}`}>
            <span className="app-logo-sub" aria-hidden="true">{t("Drums lernen - Schlag für Schlag")}</span>
          </h1>
          {!unlocked && <p className="app-price" style={{ margin: "6px 0 0", color: "#5cc8b8", font: "800 15px Figtree, sans-serif", letterSpacing: "0.02em" }}>{t("Demo")} · {t("volle App")} {DEMO_PRICE}</p>}
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
                <div className="card-lead">{beginIdx < 0 ? t("Alle 5 Schritte geschafft - such dir eine Übung aus und spiel sie nochmal.") : t(beginStep.lead)}</div>
                <div className="bg-progress is-card" aria-hidden="true">
                  {BEGIN_STEPS.map((x, i) => <span key={x.id} className={`${beginDone.has(x.id) ? "is-done" : ""}${i === beginIdx ? " is-cur" : ""}`} />)}
                </div>
                <div className="card-go">Start</div>
              </button>
              {/* eigener Knopf neben (nicht in) der Karte - Knöpfe dürfen nicht verschachtelt sein */}
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
            <div className="card-lead">{t("Hier die 40 berühmten International Drum Rudiments, die von der Percussive Arts Society seit 42 Jahren kuratiert werden.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => go("dice")}>
            <TileIcon name="dice" />
            <div className="card-kicker">{`${t("Neu")} · Rudiment`}</div>
            <div className="card-title">{t("Rudiment-Würfel")}</div>
            <div className="card-lead">{t("Würfel dir aus den 40 Rudiments deine eigene Übung - jedes Mal neu, Takt für Takt.")}</div>
            <div className="card-go">{cta("dice")}</div>
          </button>
          <button className="card has-icon" onClick={() => open("click")}>
            <TileIcon name="click" />
            <div className="card-kicker">Tempo</div>
            <div className="card-title">{t("Click-Trainer")}</div>
            <div className="card-lead">{getLang() === "en" ? "Hold your tempo, get rock-solid … now even without a click." : "Halte dein Tempo, werde „clickfest“ … jetzt auch ohne Click."}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => go("pyramid")}>
            <TileIcon name="pyramid" />
            <div className="card-kicker">Subdivision</div>
            <div className="card-title">{t("Rhythmuspyramide")}</div>
            <div className="card-lead">{t("Von 4teln bis 32teln: Übe deine Pulskontrolle und wechsle sauber zwischen den Unterteilungen.")}</div>
            <div className="card-go">{cta("pyramid")}</div>
          </button>
          <button className="card has-icon" onClick={() => go("stick")}>
            <TileIcon name="stick" />
            <div className="card-kicker">{t("Technik")}</div>
            <div className="card-title">{t("Hand Control")}</div>
            <div className="card-lead">{t("Stärke deine schwache Hand, übe saubere Wechsel und halte das Tempo.")}</div>
            <div className="card-go">{cta("stick")}</div>
          </button>
          <button className="card has-icon dy-card" onClick={() => open("diary")}>
            <TileIcon name="diary" />
            <div className="card-kicker">{`${t("Neu")} · ${t("Fortschritt")}`}</div>
            <div className="card-title">{journal ? t("Journal") : t("Übe-Tagebuch")}</div>
            <div className="card-lead">{journal ? t("Tagebuch, Hausaufgaben und Karteikasten - alles für dein Üben an einem Ort.") : t("Deine Übezeit zählt automatisch mit - ab 30 Sekunden am Stück. Mit Monatsauswertung und deinen Top 3.")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" onClick={() => open("lexicon")}>
            <TileIcon name="lexicon" />
            <div className="card-kicker">{t("Nachschlagen")}</div>
            <div className="card-title">{t("Lexikon")}</div>
            <div className="card-lead">{t("Manche Begriffe verwirren dich? Schlag nach!")}</div>
            <div className="card-go">{t("Öffnen")}</div>
          </button>
          <button className="card has-icon" type="button" onClick={() => go("rhythm")}>
            <TileIcon name="rhythm" />
            <div className="card-kicker">{t("Groove")}</div>
            <div className="card-title">{t("Eigene Grooves")}</div>
            <div className="card-lead">{t("Entwirf deinen eigenen Groove und übe ihn, bis er sitzt.")}</div>
            <div className="card-go">{cta("rhythm")}</div>
          </button>
          <button className="card has-icon" onClick={() => go("archive")}>
            <TileIcon name="archive" />
            <div className="card-kicker">{t("Eigene Blätter")}</div>
            <div className="card-title">{t("Noten")}</div>
            <div className="card-lead">{t("Lade deine Notenblätter hoch, füge Notizen hinzu und nimm sie überall hin mit.")}</div>
            <div className="card-go">{cta("archive")}</div>
          </button>
        </div>
        <AudioOffsetControl />
        <footer className="foot">
          <div className="foot-copy">Copyright by Thomas Schuster</div>
          <div className="foot-copy">Version {APP_VERSION}</div>
          <SocialLinks />
          <div className="foot-links">
            <button type="button" className="foot-link" onClick={() => open("impressum")}>{t("Impressum")}</button>
            <button type="button" className="foot-link" onClick={() => open("datenschutz")}>{t("Datenschutz")}</button>
            <FeedbackLink />
          </div>
        </footer>
        <Welcome onClose={() => setWelcomeOpen(false)} />
        <DiaryToast />
        <TesterFeedback pick={startPick} />
        {startPick === "whatsnew" ? <WhatsNew onOpen={open} onClose={() => setStartPick(null)} onNews={() => { setStartPick(null); open("news"); }} /> : null}
      </div>
    );
  }

  const meta = journal && view === "diary" ? { title: "Journal", help: "journal" } : META[view] || META.rudiments;
  return (
    <div className={`page tool view-${view}${stage ? " stage" : ""}`}>
      {paywall && (
        <DemoPaywall
          onClose={() => setPaywall(false)}
          onUnlock={() => { setUnlocked(true); setUnlockedState(true); setPaywall(false); }}
        />
      )}
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
        {journal && !printOpen ? <JournalBar view={view} /> : null}
      </header>
      <main className="main">
        {view === "first" ? <FirstLesson key={preset?.step || "next"} onHome={goHome} onOpen={open} preset={preset} />
          : view === "nostick" ? <NoStick onHome={goHome} onOpen={open} />
          : view === "dice" ? <EtudeDice />
          : view === "diary" ? (journal ? <Journal onOpen={open} /> : <PracticeDiary />)
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
      <DiaryToast />
      <TesterFeedback />
      {/* Eigene Grooves: Clip-Knopf sitzt dort im Layout unter dem Notenbild (RhythmArchive). */}
      {["rudiments", "pyramid", "stick"].includes(view) && !printOpen ? <PracticeClip title={t(meta.title)} view={view} /> : null}
      </main>
    </div>
  );
}

function DemoPaywall({ onClose, onUnlock }) {
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const field = useRef(null);
  function tryCode() {
    // Store-IAP hängt sich später an setUnlocked(true) (siehe demo.js). Bis dahin gilt der Code.
    if (unlockCodeOk(code)) { onUnlock(); return; }
    if (!String(code).trim()) { field.current?.focus(); return; }
    setBad(true);
  }
  return (
    <div role="dialog" aria-modal="true" aria-label={t("Volle App")} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(8,10,12,.72)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
      <div style={{ width: "min(480px, 100%)", maxHeight: "min(92vh, 720px)", overflow: "auto", background: "rgba(22,26,29,.97)", border: "1px solid rgba(92,200,184,.45)", borderRadius: "22px 22px 16px 16px", padding: "20px 20px 18px", color: "#f4f7f6" }}>
        <div style={{ color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.04em" }}>{t("Einmalig")}</div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 26 }}>{t("Volle App")} · {DEMO_PRICE}</h2>
        <p style={{ margin: "0 0 10px", color: "#c5d0d2", lineHeight: 1.45 }}>{t("Einmalig, kein Abo. Danach ist alles offen: NoClick, alle Rudiments, Hand Control, die schwereren Pyramiden-Stufen, Noten, Drucken der übrigen Übungen, unbegrenzte Hausaufgaben und Karteikarten — eigene Grooves mit mehr als einem Takt, und du speicherst sie.")}</p>
        <p style={{ margin: "0 0 14px", color: "#c5d0d2", lineHeight: 1.45 }}>{t("Kostenlos bleiben Erste Übung, No-Stick-Challenge, Tempo halten und Tempo steigern, Lexikon und das Tagebuch. Dazu sechs Rudiments (Single Stroke Roll, Double Stroke Open Roll, Single Paradiddle, Flam, Flam Tap, Drag), die du auch drucken kannst, der Würfel aus diesen sechs, Hand Control 1 und 2, die Rhythmuspyramide in Vierteln, Achteln und 16teln, die ersten zwei Hausaufgaben, die ersten zwei Karteikarten und eigene Grooves mit genau einem Takt zum Ausprobieren.")}</p>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 6 }}>{t("Für Tester")}</div>
        <label style={{ display: "block", fontSize: 14, color: "#9aa6aa" }}>
          {t("Code aus der Stunde")}
          <input ref={field} value={code} onChange={(e) => { setCode(e.target.value); setBad(false); }} onKeyDown={(e) => { if (e.key === "Enter") tryCode(); }} autoCapitalize="none" autoCorrect="off" autoComplete="off" style={{ display: "block", width: "100%", marginTop: 6, padding: "12px 14px", borderRadius: 12, border: "1px solid #3a4448", background: "#101416", color: "#f4f7f6", fontSize: 16 }} />
        </label>
        {bad && <p style={{ color: "#e07a7a", margin: "8px 0 0" }}>{t("Code passt nicht.")}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={tryCode} style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: 0, background: "#5cc8b8", color: "#10201c", fontWeight: 800 }}>{t("Freischalten")}</button>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: "1px solid #3a4448", background: "transparent", color: "#f4f7f6" }}>{t("Schließen")}</button>
        </div>
      </div>
    </div>
  );
}
