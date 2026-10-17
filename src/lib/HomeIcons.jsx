// Startseite: Werkzeug-Symbole im Liquid-Glass-Stil rechts auf den Kacheln.
// Das Glas (Blur, Glanzkante, Innenschein) macht CSS (.tile-icon in styles-home.css);
// hier nur die Glyphen als Inline-SVG: helle Linien (currentColor) plus türkise Akzente (.ti-acc).
const GLYPHS = {
  // Erste Übung: Start-Knopf auf einem Übungspad
  first: (
    <>
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="6.5" className="ti-soft" />
      <path className="ti-acc ti-fill" d="M13.6 11.6 21 16l-7.4 4.4z" />
    </>
  ),
  // Rudiments: Snare mit gekreuzten Sticks
  rudiments: (
    <>
      <ellipse cx="16" cy="18" rx="10" ry="3.6" />
      <path d="M6 18v5.2c0 2 4.5 3.6 10 3.6s10-1.6 10-3.6V18" />
      <path className="ti-soft" d="M10 21.4v4M16 21.8v5M22 21.4v4" />
      <path className="ti-acc" d="M8.5 5.5 18 15.2M23.5 5.5 14 15.2" />
      <circle className="ti-acc ti-fill" cx="8.3" cy="5.3" r="1.5" />
      <circle className="ti-acc ti-fill" cx="23.7" cy="5.3" r="1.5" />
    </>
  ),
  // Click-Trainer: Metronom mit Pendel
  click: (
    <>
      <path d="M12.6 4.5h6.8l5.1 22H7.5z" />
      <path d="M7.5 26.5h17" />
      <path className="ti-soft" d="M10.5 20.5h11" />
      <path className="ti-acc" d="M16 22.5 21.8 8" />
      <circle className="ti-acc ti-fill" cx="19.9" cy="12.8" r="2" />
    </>
  ),
  // Rhythmuspyramide: 1 - 2 - 4 Unterteilungen als Stufen
  pyramid: (
    <>
      <rect className="ti-acc ti-fill" x="11" y="6" width="10" height="4.4" rx="2.2" />
      <rect x="7.5" y="13.8" width="7.6" height="4.4" rx="2.2" />
      <rect x="16.9" y="13.8" width="7.6" height="4.4" rx="2.2" />
      <rect className="ti-soft ti-fill" x="4" y="21.6" width="5" height="4.4" rx="2" />
      <rect className="ti-soft ti-fill" x="11" y="21.6" width="5" height="4.4" rx="2" />
      <rect className="ti-soft ti-fill" x="18" y="21.6" width="5" height="4.4" rx="2" />
      <rect className="ti-soft ti-fill" x="25" y="21.6" width="5" height="4.4" rx="2" />
    </>
  ),
  // Hand Control: offene Hand mit Stick
  stick: (
    <>
      <path d="M10.5 16V8.6a1.7 1.7 0 0 1 3.4 0V15M13.9 14V6.4a1.7 1.7 0 0 1 3.4 0V14M17.3 14.2V7.6a1.7 1.7 0 0 1 3.4 0v8.2" />
      <path d="M20.7 13.2a1.7 1.7 0 0 1 3.4 0v5.6c0 4.4-3.3 8-7.7 8h-.8c-2.6 0-4.4-1.2-5.8-3.4l-3.3-5.2a1.8 1.8 0 0 1 2.9-2.1l1.1 1.4" />
      <path className="ti-acc" d="M27.5 4.5 21.6 10.4" />
      <circle className="ti-acc ti-fill" cx="27.6" cy="4.4" r="1.4" />
    </>
  ),
  // Lexikon: aufgeschlagenes Buch
  lexicon: (
    <>
      <path d="M16 9.2c-2.6-2-6.3-2.7-10.5-2.2v17c4.2-.5 7.9.2 10.5 2.2 2.6-2 6.3-2.7 10.5-2.2V7c-4.2-.5-7.9.2-10.5 2.2z" />
      <path d="M16 9.2v17" />
      <path className="ti-soft" d="M8.6 12.2c1.8-.1 3.4.2 4.8.9M8.6 16.2c1.8-.1 3.4.2 4.8.9" />
      <path className="ti-acc" d="M18.6 13.1c1.4-.7 3-1 4.8-.9M18.6 17.1c1.4-.7 3-1 4.8-.9M18.6 21.1c1.4-.7 3-1 4.8-.9" />
    </>
  ),
  // Eigene Grooves: Pad-Raster wie im Groove-Editor
  etude: (
    <>
      <path d="M6 22h20M6 16h20M6 10h20" />
      <circle cx="11" cy="16" r="2.2" className="ti-acc" />
      <circle cx="18" cy="10" r="2.2" className="ti-acc" />
      <circle cx="22" cy="22" r="2.2" />
    </>
  ),
  // Etüden-Würfel: Würfel mit türkisen Augen
  dice: (
    <>
      <rect x="6" y="6" width="20" height="20" rx="5" />
      <circle className="ti-acc ti-fill" cx="11.5" cy="11.5" r="2" />
      <circle className="ti-acc ti-fill" cx="16" cy="16" r="2" />
      <circle className="ti-acc ti-fill" cx="20.5" cy="20.5" r="2" />
      <circle className="ti-fill ti-soft" cx="20.5" cy="11.5" r="1.6" />
      <circle className="ti-fill ti-soft" cx="11.5" cy="20.5" r="1.6" />
    </>
  ),
  // Übe-Tagebuch: geschlossenes Tagebuch mit Rücken, türkisem Lesezeichen und Häkchen
  diary: (
    <>
      <path d="M9 5h14a2 2 0 0 1 2 2v20H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path className="ti-soft" d="M11 5v22" />
      <path className="ti-acc ti-fill" d="M19 5h4v8l-2-1.6-2 1.6z" />
      <path className="ti-acc" d="M14 19.2l2.2 2.2 4.4-4.8" />
    </>
  ),
  rhythm: (
    <>
      <path d="M3 11h26M3 16h26M3 21h26" strokeWidth="1.1" opacity="0.45" />
      <path d="M7 7v7M13 7v7M19 7v7M25 7v7" />
      <path d="M7 7h18" className="ti-acc" />
      <path d="M5.6 14.6l2.6-2.6M5.6 12l2.6 2.6" className="ti-acc" />
      <path d="M11.6 14.6l2.6-2.6M11.6 12l2.6 2.6" />
      <path d="M17.6 14.6l2.6-2.6M17.6 12l2.6 2.6" className="ti-acc" />
      <path d="M23.6 14.6l2.6-2.6M23.6 12l2.6 2.6" />
      <ellipse cx="7" cy="24" rx="2.6" ry="1.8" className="ti-acc ti-fill" />
      <path d="M4.5 24v5.4" className="ti-acc" />
      <ellipse cx="19" cy="16" rx="2.6" ry="1.8" className="ti-fill" />
    </>
  ),
  // Noten: Notenblatt mit Achtelpaar
  archive: (
    <>
      <path d="M8.5 4.5h11l5 5v18h-16z" />
      <path className="ti-soft" d="M19.5 4.5v5h5" />
      <path className="ti-soft" d="M11 13h11M11 16.5h11M11 20h11M11 23.5h11" />
      <path className="ti-acc" d="M15 22.3v-8.6l6-1.7v8.6" />
      <ellipse className="ti-acc ti-fill" cx="13.6" cy="22.6" rx="1.9" ry="1.5" />
      <ellipse className="ti-acc ti-fill" cx="19.6" cy="20.9" rx="1.9" ry="1.5" />
    </>
  ),
};

export function TileIcon({ name }) {
  const g = GLYPHS[name];
  if (!g) return null;
  return (
    <span className="tile-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {g}
      </svg>
    </span>
  );
}

// Kleines Quest-Fähnchen für die Tagesquest-Karte
export function QuestFlag() {
  return (
    <svg className="quest-flag" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path d="M3.5 14.5v-13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.2 2.2h8.6l-2.2 3.2 2.2 3.2H4.2z" fill="currentColor" />
    </svg>
  );
}
