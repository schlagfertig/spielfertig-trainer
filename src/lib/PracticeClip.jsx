import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "./i18n.js";
import { clipAudioMix, unlockAudio } from "./audio.js";
import { CLIP_CARD_STYLE, drawClipFrame, prepareClipAssets, renderBackdrop, renderCard } from "./clipFrame.js";

const TEAL = "#5cc8b8";

function pickMime() {
  const types = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function readDial() {
  const el = document.querySelector(".clip-dial");
  if (!el) return { bpm: "-", beat: false, on: false };
  return { bpm: el.dataset.bpm || "-", beat: el.dataset.beat === "1", on: el.dataset.on === "1" };
}

function readExercise() {
  const txt = (sel) => document.querySelector(sel)?.textContent?.trim() || "";
  const kick = document.querySelector(".stick-now-kick");
  const kickOwn = kick ? [...kick.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() : "";
  const stick = [kickOwn, txt(".stick-now-pos")].filter(Boolean).join(" ");
  return txt(".rud-title-name") || stick || txt(".staff-label");
}

function exerciseXml() {
  const svg = document.querySelector("#rud-live, .rud-staff-box svg, .staff-card svg, .stick-focus svg");
  return svg ? new XMLSerializer().serializeToString(svg) : "";
}

function svgImage(xml) {
  if (!xml) return Promise.resolve(null);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// Clip-Button vorübergehend ausgeblendet (Tom, 09.10.2026). Zum Einschalten auf true setzen.
export const CLIP_ENABLED = true;

export function PracticeClip(props) {
  return CLIP_ENABLED ? <PracticeClipInner {...props} /> : null;
}

// inline: Knopf im Layout statt schwebend (Meine Grooves: rechts unter dem Notenbild,
// damit die Spurnamen frei bleiben). Das Kamera-Dock haengt dann direkt am <body>,
// damit es nicht in der Stapel-Ebene des Elternelements gefangen ist.
function PracticeClipInner({ title, view, inline = false }) {
  const [open, setOpen] = useState(false);
  const [rec, setRec] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState(null);
  const [err, setErr] = useState("");
  const [facing, setFacing] = useState("environment");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunks = useRef([]);
  const drawRef = useRef(0);
  const dialRef = useRef({ bpm: "-", beat: false, on: false });
  const exRef = useRef({ name: "", img: null });

  const micRef = useRef(null);
  const mixRef = useRef(null);
  const [camTick, setCamTick] = useState(0);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function stopMic() {
    micRef.current?.getTracks().forEach((track) => track.stop());
    micRef.current = null;
    try { if (navigator.audioSession) navigator.audioSession.type = "auto"; } catch { /* aelteres Safari */ }
  }

  // Mikrofon roh, ohne Echo-/Rauschunterdrueckung und ohne Auto-Pegel:
  // sonst filtert iOS den Click und die Trommel heraus oder "pumpt".
  async function openMic() {
    if (micRef.current?.getAudioTracks().some((track) => track.readyState === "live")) return;
    try { if (navigator.audioSession) navigator.audioSession.type = "play-and-record"; } catch { /* aelteres Safari */ }
    try {
      micRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
    } catch {
      micRef.current = null;
    }
  }

  async function openCamera(nextFacing = facing) {
    setErr("");
    unlockAudio();
    stopCamera();
    try {
      // Nur Bild: das Mikrofon bleibt beim Drehen der Kamera bestehen.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacing(nextFacing);
      setOpen(true);
      setCamTick((n) => n + 1);
    } catch {
      setErr(t("Kamera nicht freigegeben."));
      return;
    }
    await openMic();
    unlockAudio();
  }

  // Das <video> gibt es erst, wenn das Dock offen ist. Deshalb den Kamera-Stream
  // erst nach dem Rendern anhaengen (vorher war videoRef beim ersten Oeffnen noch
  // leer, das Bild kam erst nach dem Drehen).
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!open || !video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => { /* startet bei loadedmetadata erneut */ });
  }, [open, camTick]);

  useEffect(() => () => { stopRecNow(); stopCamera(); stopMic(); }, []);

  async function startRec() {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    unlockAudio();
    if (video.readyState < 2) {
      video.play().catch(() => {});
      await new Promise((resolve) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        window.setTimeout(resolve, 1500);
      });
    }
    await openMic();
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    const canvasStream = canvas.captureStream(30);
    // Click (App-Ton) + Mikrofon (Trommel) zusammen in eine Tonspur.
    mixRef.current?.dispose();
    let mix = null;
    try {
      mix = clipAudioMix();
      mix.setMic(micRef.current);
    } catch { mix = null; /* nur Bild */ }
    mixRef.current = mix;
    const tracks = [...canvasStream.getVideoTracks()];
    if (mix?.track) tracks.push(mix.track);
    const recStream = new MediaStream(tracks);
    chunks.current = [];
    const mime = pickMime();
    let recorder;
    try {
      recorder = new MediaRecorder(recStream, mime ? { mimeType: mime } : undefined);
    } catch {
      recorder = new MediaRecorder(recStream);
    }
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: recorder.mimeType || "video/mp4" });
      setClip({ url: URL.createObjectURL(blob), blob, type: blob.type });
      cancelAnimationFrame(drawRef.current);
      canvasStream.getTracks().forEach((track) => track.stop());
      if (mixRef.current === mix) { mix?.dispose(); mixRef.current = null; }
    };
    const style = CLIP_CARD_STYLE;
    const backdrop = renderBackdrop(style);
    // Logos und erstes Notenbild vor dem Start laden, damit schon Bild 1 komplett ist.
    let cardKey = "";
    const firstXml = exerciseXml();
    const [assets, firstImg] = await Promise.all([prepareClipAssets(view, style), svgImage(firstXml)]);
    exRef.current = { name: readExercise(), img: firstImg };
    cardKey = `${exRef.current.name}|${firstXml}`;
    let card = null;
    const rebuildCard = () => {
      const ex = exRef.current;
      card = renderCard({ view, kicker: title, name: ex.name || title || "", notation: ex.img, assets, style });
    };
    rebuildCard();
    const draw = () => {
      drawClipFrame(ctx, { backdrop, card, view, video, seal: assets.seal, dial: dialRef.current });
      drawRef.current = requestAnimationFrame(draw);
    };
    const snap = window.setInterval(() => { dialRef.current = readDial(); }, 50);
    const refreshEx = () => {
      const name = readExercise();
      const svgXml = exerciseXml();
      const key = `${name}|${svgXml}`;
      if (key === cardKey) return;
      cardKey = key;
      svgImage(svgXml).then((img) => {
        exRef.current = { name, img: img || exRef.current.img };
        rebuildCard();
      });
    };
    const snapEx = window.setInterval(refreshEx, 350);
    recorder._snapEx = snapEx;
    recorder._snap = snap;
    draw();
    recorder.start(250);
    recRef.current = recorder;
    setSeconds(0);
    setRec(true);
    setClip(null);
  }

  function stopRecNow() {
    const recorder = recRef.current;
    if (recorder && recorder.state !== "inactive") {
      window.clearInterval(recorder._snap);
      window.clearInterval(recorder._snapEx);
      recorder.stop();
    }
  }

  function stopRec() {
    stopRecNow();
    setRec(false);
  }

  useEffect(() => {
    if (!rec) return undefined;
    const id = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [rec]);

  async function share() {
    if (!clip) return;
    const ext = clip.type.includes("mp4") ? "mp4" : "webm";
    const file = new File([clip.blob], `spielfertig-clip.${ext}`, { type: clip.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Spielfertig" });
        return;
      }
    } catch { /* abgebrochen */ }
    const a = document.createElement("a");
    a.href = clip.url;
    a.download = file.name;
    a.click();
  }

  function close() {
    stopRec();
    stopCamera();
    stopMic();
    setOpen(false);
    setClip(null);
  }

  const portal = (node) => (inline && typeof document !== "undefined" ? createPortal(node, document.body) : node);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      {!open && (
        <button type="button" className={inline ? "clip-fab clip-inline" : "clip-fab"} onClick={() => openCamera()}>{t("Clip")}</button>
      )}
      {open && portal(
        <div className="clip-dock">
          <video ref={videoRef} playsInline muted autoPlay onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})} />
          <div className="clip-actions">
            {err ? <span>{err}</span> : null}
            {rec ? <button type="button" className="play" onClick={stopRec}>{clock} · {t("Stop")}</button> : <button type="button" className="play" onClick={startRec}>{t("Aufnahme")}</button>}
            <button type="button" className="ghost" onClick={() => openCamera(facing === "environment" ? "user" : "environment")}>{t("Drehen")}</button>
            {clip ? <button type="button" className="ghost" onClick={share}>{t("Teilen")}</button> : null}
            <button type="button" className="ghost" onClick={close}>{t("Schließen")}</button>
          </div>
        </div>,
      )}
      <style>{`
        .clip-fab { position: fixed; left: 16px; bottom: 96px; z-index: 30; min-width: 84px; min-height: 52px; padding: 0 18px; border-radius: 999px; border: 0; background: ${TEAL}; color: #06120f; font: 800 17px Figtree, sans-serif; box-shadow: 0 8px 22px rgba(92,200,184,.35); }
        .clip-fab.clip-inline { position: static; min-height: 44px; min-width: 76px; padding: 0 16px; font-size: 16px; box-shadow: 0 4px 14px rgba(92,200,184,.28); }
        .clip-dock { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 40; display: grid; grid-template-columns: 132px 1fr; gap: 8px; padding: 8px; border-radius: 16px; background: rgba(22,26,29,.9); border: 1px solid #2f383d; }
        .clip-dock video { width: 132px; height: 96px; object-fit: cover; border-radius: 12px; background: #000; }
        .clip-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .clip-actions .play, .clip-actions .ghost { min-height: 40px; }
      `}</style>
    </>
  );
}
