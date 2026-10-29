import test from "node:test";
import assert from "node:assert/strict";
import { keyPem, patchProject } from "./iosSigning.mjs";

test("keyPem baut PEM mit 64er-Zeilen, auch ohne Umbrüche", () => {
  const body = "A".repeat(150);
  const pem = keyPem(`-----BEGIN PRIVATE KEY----- ${body} -----END PRIVATE KEY-----`);
  const lines = pem.trim().split("\n");
  assert.equal(lines[0], "-----BEGIN PRIVATE KEY-----");
  assert.equal(lines.at(-1), "-----END PRIVATE KEY-----");
  assert.deepEqual(lines.slice(1, -1).map((l) => l.length), [64, 64, 22]);
  assert.throws(() => keyPem(""));
});

test("patchProject ändert nur das App-Ziel", () => {
  const app = "\t\t\tbuildSettings = {\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = de.schlagfertig.app;\n\t\t\t};";
  const other = "\t\t\tbuildSettings = {\n\t\t\t\tCODE_SIGN_IDENTITY = \"iPhone Developer\";\n\t\t\t};";
  const out = patchProject(`${other}\n${app}`, { team: "T1", profile: "P 1", version: "1.4", build: "9" });
  assert.ok(out.startsWith(other));
  assert.match(out, /CODE_SIGN_STYLE = Manual;/);
  assert.doesNotMatch(out, /Automatic/);
  assert.match(out, /DEVELOPMENT_TEAM = T1;/);
  assert.match(out, /PROVISIONING_PROFILE_SPECIFIER = "P 1";/);
  assert.match(out, /CURRENT_PROJECT_VERSION = 9;/);
  assert.match(out, /MARKETING_VERSION = 1\.4;/);
  assert.throws(() => patchProject(other, { team: "T", profile: "P", version: "1", build: "1" }));
});
