/** Capacitor nur in der Store-Hülle; im Browser no-op. */
export async function initNative() {
  if (typeof window === "undefined" || !window.Capacitor) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#161a1d" });
  } catch {
    /* Browser oder Plugin fehlt */
  }
}

export async function tapHaptic() {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}
