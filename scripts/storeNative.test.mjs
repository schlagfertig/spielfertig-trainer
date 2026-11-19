import test from "node:test";
import assert from "node:assert/strict";
import {
  ensurePlistString,
  ensureIosMediaUsageDescriptions,
  IOS_CAMERA_USAGE_DE,
  IOS_MICROPHONE_USAGE_DE,
} from "./storeNative.mjs";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>Schlagfertig</string>
	<key>ITSAppUsesNonExemptEncryption</key>
	<false/>
</dict>
</plist>
`;

test("ensurePlistString fügt fehlenden Key ein und ersetzt vorhandenen", () => {
  const added = ensurePlistString(SAMPLE, "NSCameraUsageDescription", "hallo & welt");
  assert.match(added, /<key>NSCameraUsageDescription<\/key>\s*<string>hallo &amp; welt<\/string>/);
  assert.match(added, /ITSAppUsesNonExemptEncryption/);
  const replaced = ensurePlistString(added, "NSCameraUsageDescription", "neu");
  assert.match(replaced, /<string>neu<\/string>/);
  assert.equal((replaced.match(/NSCameraUsageDescription/g) || []).length, 1);
});

test("ensureIosMediaUsageDescriptions setzt Kamera- und Mikrofon-Text", () => {
  const out = ensureIosMediaUsageDescriptions(SAMPLE);
  assert.match(out, new RegExp(`NSCameraUsageDescription[\\s\\S]*${IOS_CAMERA_USAGE_DE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(out, new RegExp(`NSMicrophoneUsageDescription[\\s\\S]*${IOS_MICROPHONE_USAGE_DE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});
