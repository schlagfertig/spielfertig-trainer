import { useState } from "react";
import RudimentTrainer from "./embedded/RudimentTrainer.jsx";
import ClickTrainer from "./embedded/ClickTrainer.jsx";
import PyramidTrainer from "./embedded/PyramidTrainer.jsx";
import { Help } from "./lib/Help.jsx";

export default function App() {
  const [view, setView] = useState("home");
  const [printNonce, setPrintNonce] = useState(0);

  function goHome() {
    setPrintNonce(0);
    setView("home");
  }

  if (view === "home") {
    return (
      <div className="page home">
        <div className="home-help"><Help topic="home" /></div>
        <header className="hero">
          <img className="logo" src="/logo.svg" alt="schlagfertig‽" />
          <h1>Spielfertig</h1>
          <p className="tag">schlagfertig‽ · Zeit für guten Sound</p>
        </header>
        <div className="cards">
          <button className="card" onClick={() => setView("rudiments")}>
            <div className="card-kicker">Üben</div>
            <div className="card-title">Rudiments</div>
            <div className="card-lead">40 PAS-Rudiments. Notation, Click, Tempo.</div>
            <div className="card-go">Öffnen</div>
          </button>
          <button className="card" onClick={() => setView("click")}>
            <div className="card-kicker">Tempo</div>
            <div className="card-title">Click-Trainer</div>
            <div className="card-lead">Starttempo wählen. Alle X Sekunden um Y BPM schneller.</div>
            <div className="card-go">Öffnen</div>
          </button>
          <button className="card" onClick={() => setView("pyramid")}>
            <div className="card-kicker">Subdivision</div>
            <div className="card-title">Rhythmuspyramide</div>
            <div className="card-lead">4tel bis 32tel auf und ab. Ohne Septole.</div>
            <div className="card-go">Öffnen</div>
          </button>
        </div>
        <footer className="foot">Thomas Schuster · schlagfertig‽</footer>
      </div>
    );
  }

  const title = view === "click" ? "Click-Trainer" : view === "pyramid" ? "Rhythmuspyramide" : "Rudiments";
  const help = view === "click" ? "click" : view === "pyramid" ? "pyramid" : "rudiments";
  return (
    <div className="page tool">
      <header className="top">
        <button className="ghost" onClick={goHome}>Zurück</button>
        <div className="top-title">{title}</div>
        <div className="top-right">
          {view === "rudiments" && (
            <button className="ghost" onClick={() => setPrintNonce((n) => n + 1)}>Drucken</button>
          )}
          <Help topic={help} />
        </div>
      </header>
      <main className="main">
        {view === "click" ? <ClickTrainer /> : view === "pyramid" ? <PyramidTrainer /> : <RudimentTrainer printNonce={printNonce} />}
      </main>
    </div>
  );
}
