import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// The service worker is registered by <UpdatePrompt> (src/ui/UpdatePrompt.tsx),
// which also surfaces the "new version — Refresh" prompt. No-op in dev.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
