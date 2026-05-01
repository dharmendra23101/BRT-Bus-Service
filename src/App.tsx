import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { UserProvider, useUser } from "@/contexts/UserContext";
import { NotificationProvider } from "@/components/NotificationPopup";
import ArrivalMonitor from "@/components/ArrivalMonitor";

import Home from "./pages/Home";
import Fares from "./pages/Fares";
import Timetable from "./pages/Timetable";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Driver from "./pages/Driver";
import MapPage from "./pages/MapPage";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// 🔒 Protected Route
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return children;
};

// 🚫 Public Route
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useUser();

  if (user) return <Navigate to="/dashboard" replace />;

  return children;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <ArrivalMonitor />

              <Routes>
                {/* PUBLIC */}
                <Route path="/" element={<Home />} />
                <Route path="/fares" element={<Fares />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/map" element={<MapPage />} />

                {/* LOGIN */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />

                {/* DRIVER */}
                <Route
                  path="/driver"
                  element={
                    <ProtectedRoute>
                      <Driver />
                    </ProtectedRoute>
                  }
                />

                {/* DASHBOARD */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
