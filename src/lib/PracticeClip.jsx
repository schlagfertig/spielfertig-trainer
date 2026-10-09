import { useEffect, useRef, useState } from "react";
import { t } from "./i18n.js";
import { getCtx, recordStream } from "./audio.js";

const TEAL = "#5cc8b8";
const INK = "#161a1d";

function pickMime() {
  const types = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return types.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function readDial() {
  const el = document.querySelector(".clip-dial");
  if (!el) return { bpm: "—", beat: false, on: false };
  return { bpm: el.dataset.bpm || "—", beat: el.dataset.beat === "1", on: el.dataset.on === "1" };
}

function readExercise() {
  const name = document.querySelector(".rud-title-name, .stick-now, .staff-label")?.textContent?.trim();
  return name || "";
}

function exerciseShot() {
  const svg = document.querySelector("#rud-live, .rud-staff-box svg, .staff-card svg, .stick-focus svg");
  if (!svg) return Promise.resolve(null);
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export function PracticeClip({ title, view }) {
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
  const logoRef = useRef(null);
  const backRef = useRef(null);
  const dialRef = useRef({ bpm: "—", beat: false, on: false });
  const exRef = useRef({ name: "", img: null });

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function openCamera(nextFacing = facing) {
    setErr("");
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFacing(nextFacing);
      setOpen(true);
    } catch {
      setErr(t("Kamera nicht freigegeben."));
    }
  }

  useEffect(() => () => stopCamera(), []);

  async function startRec() {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    const canvasStream = canvas.captureStream(30);
    const mic = stream.getAudioTracks()[0];
    if (mic) canvasStream.addTrack(mic);
    chunks.current = [];
    const mime = pickMime();
    const recorder = new MediaRecorder(canvasStream, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: recorder.mimeType || "video/mp4" });
      setClip({ url: URL.createObjectURL(blob), blob, type: blob.type });
      cancelAnimationFrame(drawRef.current);
    };
    const draw = () => {
      ctx.fillStyle = "#101416";
      ctx.fillRect(0, 0, 720, 1280);
      const back = view === "rudiments" ? backRef.current : null;
      let top = 24;
      if (back) {
        const bannerH = 250;
        const scale = Math.min(720 / back.width, bannerH / back.height);
        const w = back.width * scale;
        const h = back.height * scale;
        ctx.drawImage(back, (720 - w) / 2, 12, w, h);
        top = 12 + h + 12;
      }
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const cam = { x: 24, y: top, w: 672, h: 1280 - top - 24 };
      const camScale = Math.max(cam.w / vw, cam.h / vh);
      const sw = cam.w / camScale;
      const sh = cam.h / camScale;
      ctx.save();
      if (back) { ctx.beginPath(); ctx.roundRect(cam.x, cam.y, cam.w, cam.h, 28); ctx.clip(); }
      ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, cam.x, cam.y, cam.w, cam.h);
      ctx.restore();
      if (!back) {
        const logo = logoRef.current;
        if (logo) ctx.drawImage(logo, 28, 28, 200, 160);
        ctx.fillStyle = "#f4f7f6";
        ctx.font = "800 30px Figtree, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("SCHLAGFERTIG", 28, 214);
      }
      const ex = exRef.current;
      if (ex.name || ex.img) {
        ctx.fillStyle = "rgba(244,247,246,.94)";
        ctx.beginPath();
        ctx.roundRect(24, 286, 672, 168, 18);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = "800 26px Figtree, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(ex.name || title || "", 42, 322);
        if (ex.img) {
          const scale = Math.min(620 / ex.img.width, 108 / ex.img.height);
          const w = ex.img.width * scale;
          const h = ex.img.height * scale;
          ctx.drawImage(ex.img, 36 + (640 - w) / 2, 334 + (100 - h) / 2, w, h);
        }
      }
      const dial = dialRef.current;
      const cx = 600;
      const cy = back ? top + 70 : 150;
      ctx.beginPath();
      ctx.arc(cx, cy, 78, 0, Math.PI * 2);
      ctx.fillStyle = dial.beat ? "#f4f7f6" : INK;
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = dial.beat ? "#fff" : TEAL;
      ctx.stroke();
      ctx.fillStyle = dial.beat ? TEAL : "#f4f7f6";
      ctx.font = "800 42px Figtree, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(dial.bpm), cx, cy + 8);
      ctx.font = "700 16px Figtree, sans-serif";
      ctx.fillStyle = TEAL;
      ctx.fillText("CLICK", cx, cy + 34);
      drawRef.current = requestAnimationFrame(draw);
    };
    loadImg("/logo.svg").then((img) => { logoRef.current = img; });
    if (view === "rudiments") loadImg("/rudiments-now.png").then((img) => { backRef.current = img; });
    const snap = window.setInterval(() => { dialRef.current = readDial(); }, 50);
    const snapEx = window.setInterval(() => {
      exerciseShot().then((img) => { exRef.current = { name: readExercise(), img: img || exRef.current.img }; });
    }, 350);
    recorder._snapEx = snapEx;
    recorder._snap = snap;
    draw();
    recorder.start(250);
    recRef.current = recorder;
    setSeconds(0);
    setRec(true);
    setClip(null);
  }

  function stopRec() {
    const recorder = recRef.current;
    if (recorder && recorder.state !== "inactive") {
      window.clearInterval(recorder._snap);
      window.clearInterval(recorder._snapEx);
      recorder.stop();
    }
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
    setOpen(false);
    setClip(null);
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      {!open && (
        <button type="button" className="clip-fab" onClick={() => openCamera()}>{t("Clip")}</button>
      )}
      {open && (
        <div className="clip-dock">
          <video ref={videoRef} playsInline muted autoPlay />
          <div className="clip-actions">
            {err ? <span>{err}</span> : null}
            {rec ? <button type="button" className="play" onClick={stopRec}>{clock} · {t("Stop")}</button> : <button type="button" className="play" onClick={startRec}>{t("Aufnahme")}</button>}
            <button type="button" className="ghost" onClick={() => openCamera(facing === "environment" ? "user" : "environment")}>{t("Drehen")}</button>
            {clip ? <button type="button" className="ghost" onClick={share}>{t("Teilen")}</button> : null}
            <button type="button" className="ghost" onClick={close}>{t("Schließen")}</button>
          </div>
        </div>
      )}
      <style>{`
        .clip-fab { position: fixed; left: 16px; bottom: 96px; z-index: 30; min-width: 84px; min-height: 52px; padding: 0 18px; border-radius: 999px; border: 0; background: ${TEAL}; color: #06120f; font: 800 17px Figtree, sans-serif; box-shadow: 0 8px 22px rgba(92,200,184,.35); }
        .clip-dock { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 40; display: grid; grid-template-columns: 132px 1fr; gap: 8px; padding: 8px; border-radius: 16px; background: rgba(22,26,29,.9); border: 1px solid #2f383d; }
        .clip-dock video { width: 132px; height: 96px; object-fit: cover; border-radius: 12px; background: #000; }
        .clip-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .clip-actions .play, .clip-actions .ghost { min-height: 40px; }
      `}</style>
    </>
  );
}
