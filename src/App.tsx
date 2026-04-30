import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <NotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ArrivalMonitor />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/fares" element={<Fares />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/driver" element={<Driver />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
