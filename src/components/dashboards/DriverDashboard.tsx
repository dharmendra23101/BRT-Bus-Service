import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToAssignment } from "@/services/locationService";
import { ArrowRight, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/LocaleContext";

const DriverDashboard = () => {
  const { t } = useTranslation();
  /* undefined while we are still asking; null once we know there is none. */
  const [vehicleId, setVehicleId] = useState<string | null | undefined>(
    undefined
  );

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    return subscribeToAssignment(user.uid, setVehicleId);
  }, [user]);

  const getInitials = (name?: string | null) => {
    if (!name) return "D";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Driver Info */}
      <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-2xl font-bold">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || t("driver.dashboard.role")}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user?.displayName)
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.displayName || t("driver.dashboard.role")}
            </h1>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-blue-600 font-semibold mt-1">
              🚌 {t("driver.dashboard.role")}
            </p>
          </div>
        </div>

        {/* GO LIVE SECTION */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white text-center">
          <Radio className="w-12 h-12 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-3xl font-bold mb-2">{t("driver.dashboard.title")}</h2>
          <p className="text-blue-100 mb-6">
            {t("driver.dashboard.body")}
          </p>

          <Link
            to="/driver"
            className="px-8 py-4 rounded-xl font-bold text-lg transition-[transform,box-shadow] duration-state inline-flex items-center justify-center gap-2 mx-auto bg-white text-blue-600 hover:shadow-lg hover:-translate-y-1"
          >
            {t("driver.dashboard.cta")}
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>

          {vehicleId && (
            <p className="text-blue-100 text-sm mt-6">
              Passengers see your bus as{" "}
              <span className="font-mono font-semibold text-white">
                {vehicleId}
              </span>
              . Your name and email address are never published.
            </p>
          )}

          {/*
            Said here as well as on the driver screen, because this is the
            card a driver lands on. Promising that passengers can see their
            bus while no bus is assigned would be a claim about something that
            is not happening.
          */}
          {vehicleId === null && (
            <p className="text-blue-100 text-sm mt-6">
              {t("driver.dashboard.noAssignment")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;