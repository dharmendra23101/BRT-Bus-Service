import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ✅ Suppress React Router v7 deprecation warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.("React Router Future Flag Warning") ||
    args[0]?.includes?.("v7_startTransition") ||
    args[0]?.includes?.("v7_relativeSplatPath")
  ) {
    return;
  }
  originalWarn(...args);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
