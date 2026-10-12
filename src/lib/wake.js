// Bildschirm wach halten, solange eine Übung offen ist oder das SpinDial läuft.
let lock = null;
let count = 0;

async function acquire() {
  if (!navigator.wakeLock || lock || count < 1 || document.visibilityState !== "visible") return;
  try {
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => {
      lock = null;
      if (count > 0) acquire();
    });
  } catch {
    lock = null;
  }
}

function release() {
  const current = lock;
  lock = null;
  current?.release().catch(() => {});
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && count > 0) acquire();
});

export function holdWake() {
  count += 1;
  acquire();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    count = Math.max(0, count - 1);
    if (count === 0) release();
  };
}
