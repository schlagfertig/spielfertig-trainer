import { useState } from "react";
import RudimentTrainer from "./embedded/RudimentTrainer.jsx";

export default function App() {
  const [view, setView] = useState("home");
  const [handwritten, setHandwritten] = useState(false);
  const [printNonce, setPrintNonce] = useState(0);

  if (view === "home") {
    return (
      <div className="page home">
        <header className="hero">
          <img className="logo" src="/logo.svg" alt="The best time for Rudiments is NOW" />
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
        </div>
        <footer className="foot">Thomas Schuster · schlagfertig‽</footer>
      </div>
    );
  }

  return (
    <div className="page tool">
      <header className="top">
        <button className="ghost" onClick={() => setView("home")}>Zurück</button>
        <div className="top-title">Rudiments</div>
        <div className="top-right">
          <button className={handwritten ? "ghost on" : "ghost"} onClick={() => setHandwritten((h) => !h)}>Handschrift</button>
          <button className="ghost" onClick={() => setPrintNonce((n) => n + 1)}>Drucken</button>
        </div>
      </header>
      <main className="main">
        <RudimentTrainer handwritten={handwritten} printNonce={printNonce} />
      </main>
    </div>
  );
}
