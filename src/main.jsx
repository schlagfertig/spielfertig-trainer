import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./styles-glass.css";
import "./styles-top.css";
import "./lib/enableAltStick.js";
import { initNative } from "./lib/native.js";

initNative();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
