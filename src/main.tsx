import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { registerServiceWorker } from "./services/serviceWorker";
import { installErrorReporting } from "./services/observability";

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

/*
  Installed before the first render, so an error thrown while mounting is
  caught too - which is exactly the class of failure nobody is watching a
  console for.
*/
installErrorReporting();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Registered after render so it never competes with the first paint.
void registerServiceWorker();
