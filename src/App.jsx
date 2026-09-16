import { useState } from "react";
import RudimentTrainer from "./embedded/RudimentTrainer.jsx";
import DrumEditor from "./embedded/DrumEditor.jsx";

export default function App() {
  const [view, setView] = useState("home");
  const [handwritten, setHandwritten] = useState(false);
  const [printNonce, setPrintNonce] = useState(0);

  if (view === "home") {
    return (
      <div className="page home">
        <header className="hero">
          <Stamp />
          <h1>Spielfertig</h1>
          <p className="tag">schlagfertig‽ · Zeit für guten Sound</p>
        </header>
        <div className="cards">
          <button className="card" onClick={() => setView("rudiments")}>
            <div className="card-kicker">Üben</div>
            <div className="card-title">Rudiments</div>
            <div className="card-lead">Sticking, Akzente, Tempo — zum Üben bereit.</div>
            <div className="card-go">Öffnen</div>
          </button>
          <button className="card" onClick={() => setView("groove")}>
            <div className="card-kicker">Bauen</div>
            <div className="card-title">Groove</div>
            <div className="card-lead">Raster, Notation, Play — Dein Beat.</div>
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
        <div className="seg">
          <button className={view === "rudiments" ? "on" : ""} onClick={() => setView("rudiments")}>Rudiments</button>
          <button className={view === "groove" ? "on" : ""} onClick={() => setView("groove")}>Groove</button>
        </div>
        <div className="top-right">
          <button className="ghost" onClick={() => setPrintNonce((n) => n + 1)}>Druck</button>
          <button className={handwritten ? "ghost on" : "ghost"} onClick={() => setHandwritten((h) => !h)}>Handschrift</button>
        </div>
      </header>
      <div className="brand-row">
        <Stamp small />
        <div>
          <div className="brand-title">Spielfertig</div>
          <div className="tag slim">schlagfertig‽ · Zeit für guten Sound</div>
        </div>
      </div>
      <main className="main">
        {view === "rudiments"
          ? <RudimentTrainer handwritten={handwritten} printNonce={printNonce} />
          : <DrumEditor handwritten={handwritten} printNonce={printNonce} />}
      </main>
    </div>
  );
}

function Stamp({ small }) {
  const s = small ? 56 : 112;
  return (
    <svg className="stamp" width={s} height={s} viewBox="0 0 112 112" aria-hidden="true">
      <circle cx="56" cy="56" r="52" fill="none" stroke="#5CC8B8" strokeWidth="2.2" />
      <circle cx="56" cy="56" r="42" fill="none" stroke="#5CC8B8" strokeWidth="1.1" opacity="0.75" />
      <text x="56" y="24" textAnchor="middle" fill="#5CC8B8" fontSize="7" letterSpacing="1.6" fontFamily="Oswald,sans-serif">ZEIT FÜR GUTEN SOUND</text>
      <ellipse cx="56" cy="68" rx="18" ry="11" fill="none" stroke="#F4F7F6" strokeWidth="1.6" />
      <rect x="40" y="46" width="32" height="16" rx="3" fill="none" stroke="#F4F7F6" strokeWidth="1.5" />
      <circle cx="56" cy="42" r="3.2" fill="#5CC8B8" />
      <text x="56" y="96" textAnchor="middle" fill="#F4F7F6" fontSize="9" letterSpacing="1.2" fontFamily="Oswald,sans-serif">SCHLAGFERTIG‽</text>
    </svg>
  );
}
