import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { TicketProvider } from "@/contexts/TicketContext";
import { NotificationProvider } from "@/components/NotificationPopup";
import ArrivalMonitor from "@/components/ArrivalMonitor";
import ServiceAlerts from "@/components/ServiceAlerts";
import { LiveAnnouncer } from "@/components/a11y/LiveAnnouncer";
import { RouteChangeHandler } from "@/components/a11y/RouteChangeHandler";
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequirePermission,
} from "@/components/routing/RouteGuards";
import { PERMISSIONS } from "@/domain/auth/permissions";

/*
  Every page is loaded on demand.

  The pages themselves are small; what makes this worth doing is what they
  pull in behind them. The dashboards reach Firestore, and the map and driver
  screens reach the Realtime Database, so splitting at the route boundary is
  what keeps those SDKs out of the first load for a visitor who only ever
  looks at the timetable.
*/
const Home = lazy(() => import("./pages/Home"));
const Plan = lazy(() => import("./pages/Plan"));
const RouteExplorer = lazy(() => import("./pages/RouteExplorer"));
const NearbyPlaces = lazy(() => import("./pages/NearbyPlaces"));
const PlaceDetail = lazy(() => import("./pages/PlaceDetail"));
const Fares = lazy(() => import("./pages/Fares"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Contact = lazy(() => import("./pages/Contact"));
const Help = lazy(() => import("./pages/Help"));
const About = lazy(() => import("./pages/About"));
const Search = lazy(() => import("./pages/Search"));
const Login = lazy(() => import("./pages/Login"));
const Driver = lazy(() => import("./pages/Driver"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

/**
 * Shown while a route chunk downloads.
 *
 * Deliberately minimal and centred so it occupies the same space whatever
 * follows it, avoiding a layout shift when the real page arrives.
 */
const RouteFallback = () => (
  <div
    className="min-h-screen flex items-center justify-center bg-background"
    role="status"
    aria-live="polite"
  >
    <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading page…</span>
  </div>
);

const App = () => (
  <TooltipProvider>
    <LocaleProvider>
      <AuthProvider>
        <TicketProvider>
          <LiveAnnouncer>
            <NotificationProvider>
              <Toaster />
              <Sonner />

              <BrowserRouter>
                <RouteChangeHandler />

                {/*
                First focusable element on every page, so a keyboard user
                can jump straight past the navigation.
              */}
                <a href="#main-content" className="skip-link">
                  Skip to main content
                </a>

                <ArrivalMonitor />

                <ServiceAlerts />

                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    {/* Public */}
                    <Route path="/" element={<Home />} />
                    <Route path="/plan" element={<Plan />} />
                    <Route path="/routes" element={<RouteExplorer />} />
                    <Route path="/nearby" element={<NearbyPlaces />} />
                    <Route path="/nearby/:placeId" element={<PlaceDetail />} />
                    <Route path="/fares" element={<Fares />} />
                    <Route path="/timetable" element={<Timetable />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/map" element={<MapPage />} />

                    <Route
                      path="/login"
                      element={
                        <RedirectIfAuthenticated>
                          <Login />
                        </RedirectIfAuthenticated>
                      }
                    />

                    {/*
                    Previously any signed-in user could reach /driver and the
                    page policed itself. The capability is now checked before
                    the page is ever rendered.
                  */}
                    <Route
                      path="/driver"
                      element={
                        <RequirePermission
                          permission={PERMISSIONS.PUBLISH_LOCATION}
                        >
                          <Driver />
                        </RequirePermission>
                      }
                    />

                    <Route
                      path="/dashboard"
                      element={
                        <RequireAuth>
                          <Dashboard />
                        </RequireAuth>
                      }
                    />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </NotificationProvider>
          </LiveAnnouncer>
        </TicketProvider>
      </AuthProvider>
    </LocaleProvider>
  </TooltipProvider>
);

export default App;
