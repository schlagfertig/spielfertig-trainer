import { RUDIMENTS } from "./rudiments.js";

for (const r of RUDIMENTS) {
  if (r.sticking && r.sticking[1] != null) r.altStick = true;
}
