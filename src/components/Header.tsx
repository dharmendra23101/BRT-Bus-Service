import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

const Header = () => {
  const location = useLocation();
  const { user, role, logout } = useUser();

  return (
    <header className="w-full bg-primary text-primary-foreground shadow-md">

      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

        <h1 className="text-lg font-bold">
          BRT Bus Service
        </h1>

        <nav className="flex items-center gap-6 text-sm font-medium">

          <Link to="/" className={location.pathname === "/" ? "underline" : ""}>
            Home
          </Link>

          <Link to="/map" className={location.pathname === "/map" ? "underline" : ""}>
            Live Map
          </Link>

          <Link to="/timetable" className={location.pathname === "/timetable" ? "underline" : ""}>
            Time Table
          </Link>

          <Link to="/fares" className={location.pathname === "/fares" ? "underline" : ""}>
            Bus Fares
          </Link>

          {user && (
            <Link to="/dashboard" className={location.pathname === "/dashboard" ? "underline" : ""}>
              Dashboard
            </Link>
          )}

          {(role === "driver" || role === "admin") && (
            <Link to="/driver" className={location.pathname === "/driver" ? "underline" : ""}>
              Driver
            </Link>
          )}

          {!user && (
            <Link to="/login" className={location.pathname === "/login" ? "underline" : ""}>
              Login
            </Link>
          )}

          {user && (
            <button
              onClick={logout}
              className="bg-white text-primary px-3 py-1 rounded hover:opacity-80"
            >
              Logout
            </button>
          )}

        </nav>
      </div>
    </header>
  );
};

export default Header;