import { useEffect, useRef, useState } from "react";
import RudimentTrainer from "./embedded/RudimentTrainer.jsx";
import ClickTrainer from "./embedded/ClickTrainer.jsx";
import PyramidTrainer from "./embedded/PyramidTrainer.jsx";
import StickControl from "./embedded/StickControl.jsx";
import Archive from "./embedded/Archive.jsx";
import { Help } from "./lib/Help.jsx";
import FirstLesson from "./lib/FirstLesson.jsx";
import Legal from "./lib/Legal.jsx";
import { loadSession } from "./lib/session.js";

const META = {
  first: { title: "Erste Uebung", help: "home" },
  rudiments: { title: "Rudiments", help: "rudiments" },
  click: { title: "Click-Trainer", help: "click" },
  pyramid: { title: "Rhythmuspyramide", help: "pyramid" },
  stick: { title: "Stick Control", help: "stick" },
  archive: { title: "Noten", help: "archive" },
  impressum: { title: "Impressum", help: "home" },
  datenschutz: { title: "Datenschutz", help: "home" },
};

export default function App() {
  const [view, setView] = useState("home");
  const [printOpen, setPrintOpen] = useState(false);
  const [stage, setStage] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const firstDone = !!loadSession("firstLesson", {}).done;

  function goHome() {
    setPrintOpen(false);
    setStage(false);
    setSheetOpen(false);
    setView("home");
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
    try { window.history.pushState({ sf: next }, ""); } catch { /* ignore */ }
  }

  useEffect(() => {
    function onPop() {
      if (printOpen) { setPrintOpen(false); return; }
      if (viewRef.current !== "home") goHome();
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
        <div className="home-help"><Help topic="home" /></div>
        <header className="hero">
          <img className="logo" src="/logo.svg?v=clear" alt="schlagfertig" />
          <h1>Spielfertig</h1>
          <p className="tag">schlagfertig · Zeit fuer guten Sound</p>
        </header>
        <button className="card" style={{ width: "100%", borderColor: "#5cc8b8", marginTop: 8 }} onClick={() => open("first")}>
          <div className="card-kicker">{firstDone ? "Nochmal" : "Loslegen"}</div>
          <div className="card-title">Erste Uebung starten</div>
          <div className="card-lead">Eine Minute mitklicken. Kein Fachwort noetig.</div>
          <div className="card-go">Start</div>
        </button>
        <div className="cards">
          <button className="card" onClick={() => open("rudiments")}>
            <div className="card-kicker">Ueben</div>
            <div className="card-title">Rudiments</div>
            <div className="card-lead">40 PAS-Rudiments. Notation, Click, Tempo.</div>
            <div className="card-go">Oeffnen</div>
          </button>
          <button className="card" onClick={() => open("click")}>
            <div className="card-kicker">Tempo</div>
            <div className="card-title">Click-Trainer</div>
            <div className="card-lead">Starttempo waehlen. Alle X Sekunden um Y BPM schneller.</div>
            <div className="card-go">Oeffnen</div>
          </button>
          <button className="card" onClick={() => open("pyramid")}>
            <div className="card-kicker">Subdivision</div>
            <div className="card-title">Rhythmuspyramide</div>
            <div className="card-lead">4tel bis 32tel: Puls festigen, sauber zwischen Unterteilungen wechseln, Tempo trotz Dichte halten.</div>
            <div className="card-go">Oeffnen</div>
          </button>
          <button className="card" onClick={() => open("stick")}>
            <div className="card-kicker">Technik</div>
            <div className="card-title">Stick Control</div>
            <div className="card-lead">nach G. L. Stone: Schwache Hand verbessern, saubere Wechsel ueben, Tempo ohne Verspannungen halten.</div>
            <div className="card-go">Oeffnen</div>
          </button>
          <button className="card" onClick={() => open("archive")}>
            <div className="card-kicker">Eigene Blaetter</div>
            <div className="card-title">Noten</div>
            <div className="card-lead">Fotos und PDFs lokal ablegen und waehrenddessen aufschlagen.</div>
            <div className="card-go">Oeffnen</div>
          </button>
        </div>
        <footer className="foot">
          <div>Thomas Schuster · schlagfertig</div>
          <div className="foot-links">
            <button type="button" className="foot-link" onClick={() => open("impressum")}>Impressum</button>
            <button type="button" className="foot-link" onClick={() => open("datenschutz")}>Datenschutz</button>
          </div>
        </footer>
      </div>
    );
  }

  const meta = META[view] || META.rudiments;
  return (
    <div className={stage ? "page tool stage" : "page tool"}>
      <header className="top" style={{ zIndex: 50 }}>
        {stage && !printOpen ? (
          <button className="ghost" onClick={() => setStage(false)}>Pad aus</button>
        ) : (
          <button className="ghost" onClick={back}>Zurueck</button>
        )}
        <div className="top-title">{printOpen && view === "rudiments" ? "Drucken" : meta.title}</div>
        <div className="top-right">
          {view === "archive" && !printOpen && (
            <button className={sheetOpen ? "ghost on" : "ghost"} onClick={() => setSheetOpen((v) => !v)}>Blatt</button>
          )}
          {view === "rudiments" && !stage && !printOpen && (
            <button className="ghost" onClick={() => setPrintOpen(true)}>Drucken</button>
          )}
          {view === "rudiments" && !printOpen && (
            <button
              className={stage ? "ghost on" : "ghost"}
              title="Notation gross, weniger Bedienelemente."
              aria-label={stage ? "Uebepad aus" : "Uebepad"}
              onClick={() => setStage((v) => !v)}
            >{stage ? "Pad aus" : "Uebepad"}</button>
          )}
          {!stage && !printOpen && view !== "first" && view !== "impressum" && view !== "datenschutz" && <Help topic={meta.help} />}
        </div>
      </header>
      <main className="main">
        {view === "first" ? <FirstLesson onHome={goHome} onOpen={open} />
          : view === "impressum" ? <Legal topic="impressum" />
          : view === "datenschutz" ? <Legal topic="datenschutz" />
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
