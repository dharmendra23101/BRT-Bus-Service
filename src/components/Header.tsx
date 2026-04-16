import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useState, useEffect } from "react";
import {
	Menu,
	X,
	MapPin,
	Clock,
	DollarSign,
	LayoutDashboard,
	User,
	LogOut,
} from "lucide-react";

const Header = () => {
	const location = useLocation();
	const { user, role, logout } = useUser();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		setIsMenuOpen(false);
	}, [location]);

	const isActive = (path: string) => location.pathname === path;

	const navLinks = [
  { to: "/", label: "Home", icon: MapPin },
  { to: "/map", label: "Live Map", icon: MapPin },
  { to: "/timetable", label: "Time Table", icon: Clock },
  { to: "/fares", label: "Bus Fares", icon: DollarSign },
  { to: "/contact", label: "Contact Us", icon: User },   
];

	return (
		<header
			className={`sticky top-0 z-50 w-full transition-all duration-300 ${
				isScrolled
					? "bg-primary/95 backdrop-blur-md shadow-lg"
					: "bg-primary shadow-md"
			}`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16 lg:h-20">
					{/* Logo */}
					<Link
						to="/"
						className="flex items-center gap-3 text-primary-foreground group"
					>
						<div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-all duration-300">
							<img
								src="/logo1.png"
								alt="logo"
								className="w-10 h-10 lg:w-12 lg:h-12 object-contain"
							/>
						</div>
						<div className="flex flex-col">
							<span className="text-lg lg:text-xl font-bold tracking-tight">
								BRT Bus Service
							</span>
							<span className="text-xs text-primary-foreground/80 hidden sm:block">
								Your Journey, Our Priority
							</span>
						</div>
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden lg:flex items-center gap-1">
						{navLinks.map(({ to, label, icon: Icon }) => (
							<Link
								key={to}
								to={to}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
									isActive(to)
										? "bg-white/20 text-white"
										: "text-primary-foreground/90 hover:bg-white/10 hover:text-white"
								}`}
							>
								<Icon className="w-4 h-4" />
								{label}
							</Link>
						))}

						{user && (
							<Link
								to="/dashboard"
								className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
									isActive("/dashboard")
										? "bg-white/20 text-white"
										: "text-primary-foreground/90 hover:bg-white/10 hover:text-white"
								}`}
							>
								<LayoutDashboard className="w-4 h-4" />
								Dashboard
							</Link>
						)}

						{(role === "driver" || role === "admin") && (
							<Link
								to="/driver"
								className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
									isActive("/driver")
										? "bg-white/20 text-white"
										: "text-primary-foreground/90 hover:bg-white/10 hover:text-white"
								}`}
							>
								<User className="w-4 h-4" />
								Driver
							</Link>
						)}

						<div className="ml-4 flex items-center gap-2">
							{!user ? (
								<Link
									to="/login"
									className="flex items-center gap-2 bg-white text-primary px-5 py-2 rounded-lg font-semibold hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl"
								>
									<User className="w-4 h-4" />
									Login
								</Link>
							) : (
								<button
									onClick={logout}
									className="flex items-center gap-2 bg-white/10 text-white px-5 py-2 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 border border-white/20"
								>
									<LogOut className="w-4 h-4" />
									Logout
								</button>
							)}
						</div>
					</nav>

					{/* Mobile Menu Button */}
					<button
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						className="lg:hidden text-primary-foreground p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
						aria-label="Toggle menu"
					>
						{isMenuOpen ? (
							<X className="w-6 h-6" />
						) : (
							<Menu className="w-6 h-6" />
						)}
					</button>
				</div>
			</div>

			{/* Mobile Navigation */}
			<div
				className={`lg:hidden fixed inset-y-0 right-0 w-64 bg-primary shadow-2xl transform transition-transform duration-300 ease-in-out ${
					isMenuOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="flex flex-col h-full pt-20 pb-6 px-4 overflow-y-auto">
					{navLinks.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 mb-1 ${
								isActive(to)
									? "bg-white/20 text-white"
									: "text-primary-foreground/90 hover:bg-white/10 hover:text-white"
							}`}
						>
							<Icon className="w-5 h-5" />
							{label}
						</Link>
					))}

					{user && (
						<Link
							to="/dashboard"
							className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 mb-1 ${
								isActive("/dashboard")
									? "bg-white/20 text-white"
									: "text-primary-foreground/90 hover:bg-white/10 hover:text-white"
							}`}
						>
							<LayoutDashboard className="w-5 h-5" />
							Dashboard
						</Link>
					)}

					{(role === "driver" || role === "admin") && (
						<Link
							to="/driver"
							className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 mb-1 ${
								isActive("/driver")
									? "bg-white/20 text-white"
									: "text-primary-foreground/90 hover:bg-white/10 hover:text-white"
							}`}
						>
							<User className="w-5 h-5" />
							Driver
						</Link>
					)}

					<div className="mt-6 pt-6 border-t border-white/20">
						{!user ? (
							<Link
								to="/login"
								className="flex items-center justify-center gap-2 bg-white text-primary px-5 py-3 rounded-lg font-semibold hover:bg-white/90 transition-all duration-300 shadow-lg"
							>
								<User className="w-5 h-5" />
								Login
							</Link>
						) : (
							<button
								onClick={logout}
								className="w-full flex items-center justify-center gap-2 bg-white/10 text-white px-5 py-3 rounded-lg font-medium hover:bg-white/20 transition-all duration-300 border border-white/20"
							>
								<LogOut className="w-5 h-5" />
								Logout
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Overlay */}
			{isMenuOpen && (
				<div
					className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[-1]"
					onClick={() => setIsMenuOpen(false)}
				/>
			)}
		</header>
	);
};

export default Header;
