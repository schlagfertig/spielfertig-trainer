import { t } from "./i18n.js";
import { applyMeta, normalizeMeta, parseView } from "./archiveMeta.js";
import { loadSession, saveSession } from "./session.js";
import { normalizeNotes } from "./sheetNotes.js";

const DB = "sf.archive.v1";
const STORE = "sheets";
const LAST = "sf.v1.archive.last";
const LAST2 = "sf.v1.archive.last2";
export const MAX_BYTES = 12 * 1024 * 1024;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error(t("Archiv nicht verfügbar")));
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error(t("abgebrochen")));
  });
}

export async function listSheets() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result || []).sort((a, b) => (b.added || 0) - (a.added || 0));
      // WA-22: alte Einträge ohne Tags werden beim Lesen ergänzt (nur Anzeige, nichts wird überschrieben).
      resolve(rows.map(({ blob, ...meta }) => normalizeMeta(meta, t("Blatt"))));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSheet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ? normalizeMeta(req.result, t("Blatt")) : null);
    req.onerror = () => reject(req.error);
  });
}

export async function addSheet(file) {
  if (!file) throw new Error(t("Keine Datei."));
  if (file.size > MAX_BYTES) throw new Error(t("Maximal 12 MB pro Blatt."));
  const mime = file.type || "";
  const pdf = mime === "application/pdf" || /\.pdf$/i.test(file.name || "");
  const image = mime.startsWith("image/");
  if (!pdf && !image) throw new Error(t("Nur Foto oder PDF."));
  const rec = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: (file.name || (pdf ? `${t("Blatt")}.pdf` : t("Foto"))).replace(/\.[^.]+$/, "") || t("Blatt"),
    kind: pdf ? "pdf" : "image",
    mime: mime || (pdf ? "application/pdf" : "image/jpeg"),
    size: file.size,
    added: Date.now(),
    fileName: file.name || "",
    tags: [],
    metaV: 1,
    blob: file,
  };
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(rec);
  await txDone(tx);
  rememberLast(rec.id);
  return rec.id;
}

export async function removeSheet(id) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  if (lastId() === id) rememberLast("");
  if (lastId2() === id) rememberLast2("");
}

/** WA-22: Name und/oder Tags ändern. Blob und übrige Felder bleiben unverändert. */
export async function updateSheetMeta(id, meta) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const req = store.get(id);
  req.onsuccess = () => {
    if (req.result) store.put(applyMeta(req.result, meta));
  };
  await txDone(tx);
}

/** Notizen (Notizfeld, Stift, Marker) im selben Eintrag wie das Blatt speichern - siehe sheetNotes.js. */
export async function updateSheetNotes(id, notes) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const req = store.get(id);
  req.onsuccess = () => {
    if (req.result) store.put({ ...req.result, notes: normalizeNotes({ ...notes, updated: Date.now() }) });
  };
  await txDone(tx);
}

export async function renameSheet(id, name) {
  await updateSheetMeta(id, { name });
}

// WA-22: Sortierung merken (Suche/Tag-Filter bewusst nicht - nach dem Neuladen sieht man wieder alles).
export function loadArchiveView() { return parseView(loadSession("archiveView", {})); }
export function saveArchiveView(v) { saveSession("archiveView", parseView(v)); }

function readKey(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}
function writeKey(key, id) {
  try {
    if (id) localStorage.setItem(key, id);
    else localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export function lastId() { return readKey(LAST); }
export function lastId2() { return readKey(LAST2); }
export function rememberLast(id) { writeKey(LAST, id); }
export function rememberLast2(id) { writeKey(LAST2, id); }
