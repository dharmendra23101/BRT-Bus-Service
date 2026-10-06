import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { reportCaught } from "@/services/observability";
import { STORAGE_KEYS } from "@/constants/config";
import {
  ENGLISH,
  isLocale,
  loadedCatalogue,
  translate,
  type LoadedCatalogue,
} from "@/domain/i18n/strings";

/**
 * The language to fail in.
 *
 * This boundary sits OUTSIDE `LocaleProvider` on purpose - it has to survive
 * a crash in the provider itself - so it cannot use the hook, and reads the
 * stored choice directly.
 *
 * A language is only used if it is already in memory. Fetching one while the
 * app is on fire is the wrong moment to depend on the network, and English is
 * always present. That is also why the fallback renders `lang` from the
 * catalogue it actually got rather than from the choice: English announced in
 * a Hindi voice is not a degraded error screen, it is an unreadable one.
 */
const failureCatalogue = (): LoadedCatalogue => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);

    if (isLocale(stored)) return loadedCatalogue(stored) ?? ENGLISH;
  } catch {
    /* A device that refuses storage still gets an error screen. */
  }

  return ENGLISH;
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /*
    The passenger sees a fallback and carries on, which means this is the one
    failure that is handled from their side and invisible from every other.
    Reporting it is how it still gets counted.
  */
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
    reportCaught("boundary", error);

    document.documentElement.lang = failureCatalogue().locale;
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    /*
      Read at failure time rather than tracked: this renders once, and
      `navigator.onLine` only claims there is a network interface, so it is
      used to soften the wording and never to assert a diagnosis.
    */
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;

    const catalogue = failureCatalogue();
    const t = (key: Parameters<typeof translate>[1]) =>
      translate(catalogue, key);

    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-background flex items-center justify-center px-4"
      >
        <div
          role="alert"
          className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center"
        >
          <AlertTriangle
            className="w-12 h-12 text-orange-500 mx-auto mb-4"
            aria-hidden="true"
          />

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {t(offline ? "boundary.offlineTitle" : "boundary.title")}
          </h1>

          {/*
            Offline is a distinct failure now that the app has a service
            worker. A page opened before is served from the cache; one that
            has not been is simply absent, and telling somebody with no signal
            to reload is advice that cannot work.
          */}
          <p className="text-gray-600 mb-6">
            {t(offline ? "boundary.offlineBody" : "boundary.body")}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="brt-button touch-target inline-flex items-center"
            >
              {t("boundary.reload")}
            </button>

            <a
              href="/"
              className="px-6 py-3 rounded-xl border border-border font-semibold text-foreground hover:bg-secondary transition-colors touch-target inline-flex items-center"
            >
              {t("boundary.home")}
            </a>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
