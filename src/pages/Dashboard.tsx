import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LocaleContext";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import UserDashboard from "@/components/dashboards/UserDashboard";
import DriverDashboard from "@/components/dashboards/DriverDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import { AlertCircle, Loader } from "lucide-react";

const Dashboard = () => {
  const { t } = useTranslation();
  const { actor, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
          <p className="text-primary-deep font-medium">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-8 px-4">
        {error && (
          <div
            role="alert"
            className="max-w-5xl mx-auto mb-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" aria-hidden="true" />
            <p className="text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-destructive hover:text-destructive font-medium touch-target px-2"
            >
              {t("action.dismiss")}
              <span className="sr-only"> error message</span>
            </button>
          </div>
        )}

        {/*
          Chosen by capability rather than by role string, so an unresolved
          or unrecognised role falls through to the least-privileged view
          instead of matching nothing or defaulting to something elevated.
        */}
        {can(actor, PERMISSIONS.VIEW_ADMIN_PANEL) ? (
          <AdminDashboard onError={setError} />
        ) : can(actor, PERMISSIONS.PUBLISH_LOCATION) ? (
          <DriverDashboard />
        ) : (
          <UserDashboard />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
