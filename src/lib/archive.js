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
    req.onerror = () => reject(req.error || new Error("Archiv nicht verfügbar"));
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("abgebrochen"));
  });
}

export async function listSheets() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result || []).sort((a, b) => (b.added || 0) - (a.added || 0));
      resolve(rows.map(({ blob, ...meta }) => meta));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSheet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function addSheet(file) {
  if (!file) throw new Error("Keine Datei.");
  if (file.size > MAX_BYTES) throw new Error("Maximal 12 MB pro Blatt.");
  const mime = file.type || "";
  const pdf = mime === "application/pdf" || /\.pdf$/i.test(file.name || "");
  const image = mime.startsWith("image/");
  if (!pdf && !image) throw new Error("Nur Foto oder PDF.");
  const rec = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: (file.name || (pdf ? "Blatt.pdf" : "Foto")).replace(/\.[^.]+$/, "") || "Blatt",
    kind: pdf ? "pdf" : "image",
    mime: mime || (pdf ? "application/pdf" : "image/jpeg"),
    size: file.size,
    added: Date.now(),
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

export async function renameSheet(id, name) {
  const rec = await getSheet(id);
  if (!rec) return;
  rec.name = String(name || rec.name).trim() || rec.name;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(rec);
  await txDone(tx);
}

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
