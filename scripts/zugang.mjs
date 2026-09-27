// Einladungslink erzeugen. Geheimnis nur aus der Umgebung, nie aus dem Repo.
//   ZUGANG_SECRET=… node scripts/zugang.mjs anna        → neues Kürzel anna-xx, 21 Tage
//   ZUGANG_SECRET=… node scripts/zugang.mjs anna 30     → 30 Tage
//   ZUGANG_SECRET=… node scripts/zugang.mjs --id tom 365 → festes Kürzel (Tom, testbot, Verlängerung)
// Optional ZUGANG_LISTE=/pfad/links.csv: hängt „id;name;gültig bis;erstellt“ an (Zuordnung bleibt außerhalb des Repos).
import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createToken, ID_RE } from "../access/token.js";

const BASE = "https://spielfertig-trainer.vercel.app";

function berlin(ms) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// Ende (23:59:59 Berlin) des Tages „heute + days“, in Unix-Sekunden
export function endOfBerlinDay(days, now = Date.now()) {
  const today = new Date(berlin(now));
  const target = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days, 23, 59, 59);
  let ms = target;
  for (let i = 0; i < 2; i++) ms -= berlin(ms) - target;
  return Math.floor(ms / 1000);
}

// Nur der Vorname, z. B. "Anna Müller" → "anna"
function slug(name) {
  return name.trim().split(/\s+/)[0].toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 12) || "t";
}

async function main(argv) {
  const fixed = argv[0] === "--id";
  const args = fixed ? argv.slice(1) : argv;
  const [who, daysArg] = args;
  const days = daysArg === undefined ? 21 : Number(daysArg);
  if (!who || !Number.isInteger(days) || days < 0 || days > 366) {
    console.error("Aufruf: node scripts/zugang.mjs <name> [tage=21]   oder   --id <kürzel> [tage=21]");
    process.exit(1);
  }
  const id = fixed ? who : `${slug(who)}-${randomBytes(2).readUInt16BE(0).toString(36).padStart(2, "0").slice(-2)}`;
  if (!ID_RE.test(id)) { console.error(`Ungültiges Kürzel: ${id} (erlaubt: a-z, 0-9, -, max. 24)`); process.exit(1); }
  const exp = endOfBerlinDay(days);
  let token;
  try { token = await createToken(process.env.ZUGANG_SECRET, id, exp); } catch (e) { console.error(e.message); process.exit(1); }
  const until = new Date(exp * 1000).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "long", timeStyle: "short" });
  if (process.env.ZUGANG_LISTE) appendFileSync(process.env.ZUGANG_LISTE, `${id};${who};${until};${new Date().toISOString()}\n`);
  console.log(`Kürzel:     ${id}\nGültig bis: ${until} (Berlin)\nLink:       ${BASE}/?zugang=${token}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
