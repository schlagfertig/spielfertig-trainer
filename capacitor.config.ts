import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.schlagfertig.trainer",
  appName: "Spielfertig Control",
  webDir: "dist",
  backgroundColor: "#161a1d",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "Spielfertig Control",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#161a1d",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#161a1d",
    },
  },
};

export default config;
