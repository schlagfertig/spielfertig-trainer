import { useEffect, useRef, useState } from "react";
import RudimentTrainer from "./embedded/RudimentTrainer.jsx";
import ClickTrainer from "./embedded/ClickTrainer.jsx";
import PyramidTrainer from "./embedded/PyramidTrainer.jsx";
import StickControl from "./embedded/StickControl.jsx";
import Archive from "./embedded/Archive.jsx";
import { Help } from "./lib/Help.jsx";

const META = {
  rudiments: { title: "Rudiments", help: "rudiments" },
  click: { title: "Click-Trainer", help: "click" },
  pyramid: { title: "Rhythmuspyramide", help: "pyramid" },
  stick: { title: "Stick Control", help: "stick" },
  archive: { title: "Noten", help: "archive" },
};

export default function App() {
  const [view, setView] = useState("home");
  const [printNonce, setPrintNonce] = useState(0);
  const [stage, setStage] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  function goHome() {
    setPrintNonce(0);
    setStage(false);
    setSheetOpen(false);
    setView("home");
  }

  function open(next) {
    setStage(false);
    setSheetOpen(false);
    setView(next);
    try { window.history.pushState({ sf: next }, ""); } catch { /* ignore */ }
  }

  useEffect(() => {
    function onPop() {
      if (viewRef.current !== "home") goHome();
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
        if (sheetOpen) {
          setSheetOpen(false);
          return;
        }
        if (stage) {
          setStage(false);
          return;
        }
        if (window.history.state?.sf) window.history.back();
        else goHome();
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
  }, [view, stage, sheetOpen]);

  if (view === "home") {
    return (
      <div className="page home">
        <div className="home-help"><Help topic="home" /></div>
        <header className="hero">
          <img className="logo" src="/logo.svg?v=clear" alt="schlagfertig‽" />
          <h1>Spielfertig</h1>
          <p className="tag">schlagfertig‽ · Zeit für guten Sound</p>
        </header>
        <div className="cards">
          <button className="card" onClick={() => open("rudiments")}>
            <div className="card-kicker">Üben</div>
            <div className="card-title">Rudiments</div>
            <div className="card-lead">40 PAS-Rudiments. Notation, Click, Tempo.</div>
            <div className="card-go">Öffnen</div>
          </button>
          <button className="card" onClick={() => open("click")}>
            <div className="card-kicker">Tempo</div>
            <div className="card-title">Click-Trainer</div>
            <div className="card-lead">Starttempo wählen. Alle X Sekunden um Y BPM schneller.</div>
            <div className="card-go">Öffnen</div>
          </button>
          <button className="card" onClick={() => open("pyramid")}>
            <div className="card-kicker">Subdivision</div>
            <div className="card-title">Rhythmuspyramide</div>
            <div className="card-lead">4tel bis 32tel auf und ab. Ohne Septole.</div>
            <div className="card-go">Öffnen</div>
          </button>
          <button className="card" onClick={() => open("stick")}>
            <div className="card-kicker">Technik</div>
            <div className="card-title">Stick Control</div>
            <div className="card-lead">Nach G. L. Stone. Hände ausgleichen — Kontrolle, Tempo, Ausdauer.</div>
            <div className="card-go">Öffnen</div>
          </button>
          <button className="card" onClick={() => open("archive")}>
            <div className="card-kicker">Eigene Blätter</div>
            <div className="card-title">Noten</div>
            <div className="card-lead">Fotos und PDFs lokal ablegen und währenddessen aufschlagen.</div>
            <div className="card-go">Öffnen</div>
          </button>
        </div>
        <footer className="foot">Thomas Schuster · schlagfertig‽</footer>
      </div>
    );
  }

  const meta = META[view] || META.rudiments;
  return (
    <div className={stage ? "page tool stage" : "page tool"}>
      <header className="top">
        {stage ? (
          <button className="ghost" onClick={() => setStage(false)}>Pad aus</button>
        ) : (
          <button className="ghost" onClick={() => {
            if (sheetOpen) { setSheetOpen(false); return; }
            if (window.history.state?.sf) window.history.back();
            else goHome();
          }}>Zurück</button>
        )}
        <div className="top-title">{meta.title}</div>
        <div className="top-right">
          {view === "archive" && (
            <button className={sheetOpen ? "ghost on" : "ghost"} onClick={() => setSheetOpen((v) => !v)}>Blatt</button>
          )}
          {view === "rudiments" && !stage && (
            <button className="ghost" onClick={() => setPrintNonce((n) => n + 1)}>Drucken</button>
          )}
          {view === "rudiments" && (
            <button className={stage ? "ghost on" : "ghost"} onClick={() => setStage((v) => !v)}>{stage ? "Pad aus" : "Pad"}</button>
          )}
          {!stage && <Help topic={meta.help} />}
        </div>
      </header>
      <main className="main">
        {view === "click" ? <ClickTrainer />
          : view === "pyramid" ? <PyramidTrainer />
          : view === "stick" ? <StickControl />
          : view === "archive" ? <Archive />
          : <RudimentTrainer printNonce={printNonce} stage={stage} />}
      </main>
      {sheetOpen && view === "archive" ? <Archive overlay onClose={() => setSheetOpen(false)} /> : null}
    </div>
  );
}
