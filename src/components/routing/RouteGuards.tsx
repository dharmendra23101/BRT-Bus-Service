/**
 * Route-level access control.
 *
 * Guards do two jobs: they keep unauthorized users off privileged pages, and
 * they hold rendering until the session is fully resolved. The second matters
 * as much as the first - rendering a page while `role` is still null would
 * flash admin UI to a passenger for a frame before correcting itself.
 *
 * These are a usability boundary, not a security one. A determined visitor
 * can render any component they like by editing the bundle; what actually
 * protects data is the Firestore rules the underlying reads must satisfy.
 */

import type { ReactNode } from "react";
import { Navigate, useLocation, type Location } from "react-router-dom";
import { Loader, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { can, type Permission } from "@/domain/auth/permissions";
import { useTranslation } from "@/contexts/LocaleContext";

/** Shown while the session resolves, so no protected UI renders early. */
const ResolvingSession = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <p className="text-primary-deep font-medium">{t("guard.checking")}</p>
      </div>
    </div>
  );
};

/**
 * Shown when a signed-in user lacks a capability.
 *
 * Deliberately says nothing about what the page contains or which role would
 * grant access - a refusal should not double as a map of the app.
 */
const AccessDenied = () => {
  const { t } = useTranslation();

  return (
  <div className="min-h-screen bg-background flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center">
      <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        {t("guard.deniedTitle")}
      </h1>
      <p className="text-gray-600">{t("guard.deniedBody")}</p>
    </div>
  </div>
  );
};

/** Requires a signed-in user; remembers where they were heading. */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <ResolvingSession />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};

/** Requires a signed-in user holding a specific capability. */
export const RequirePermission = ({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) => {
  const { user, actor, loading } = useAuth();
  const location = useLocation();

  if (loading) return <ResolvingSession />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (!can(actor, permission)) return <AccessDenied />;

  return <>{children}</>;
};

/** Keeps an already-signed-in user off pages meant for visitors. */
export const RedirectIfAuthenticated = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <ResolvingSession />;

  if (user) {
    const from = location.state?.from as Location | undefined;
    const target =
      from &&
      typeof from.pathname === "string" &&
      from.pathname.startsWith("/") &&
      !from.pathname.startsWith("//") &&
      !from.pathname.startsWith("/\\")
        ? from
        : "/dashboard";

    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
