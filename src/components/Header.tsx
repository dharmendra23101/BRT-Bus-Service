import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useState, useEffect, useRef } from "react";
import { Home, MapPin, Clock, DollarSign, Phone, LayoutDashboard, LogOut, Menu, X, ChevronDown } from "lucide-react";

const Header = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, logout } = useUser();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const profileRef = useRef<HTMLDivElement>(null);
	const mobileMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Handle clicking outside profile menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
				setIsProfileOpen(false);
			}
		};

		if (isProfileOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isProfileOpen]);

	// Handle clicking outside mobile menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
				const menuButton = document.querySelector("[data-menu-trigger]");
				if (menuButton && !menuButton.contains(event.target as Node)) {
					setIsMenuOpen(false);
				}
			}
		};

		if (isMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isMenuOpen]);

	const isActive = (path: string) => location.pathname === path;

	const navLinks = [
		{ to: "/", label: "Home", icon: Home },
		{ to: "/map", label: "Live Map", icon: MapPin },
		{ to: "/timetable", label: "Time Table", icon: Clock },
		{ to: "/fares", label: "Bus Fares", icon: DollarSign },
		{ to: "/contact", label: "Contact Us", icon: Phone },
	];

	const getInitials = (name: string): string => {
		if (!name) return "U";
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const getShortName = (name: string): string => {
		if (!name) return "User";
		return name.split(" ")[0];
	};

	const handleDashboardClick = () => {
		setIsProfileOpen(false);
		setIsMenuOpen(false);
		navigate("/dashboard");
	};

	const handleLogout = async () => {
		setIsLoggingOut(true);
		setIsProfileOpen(false);
		setIsMenuOpen(false);
		try {
			await logout();
			navigate("/login", { replace: true });
		} catch (error) {
			console.error("Logout failed:", error);
			setIsLoggingOut(false);
		}
	};

	return (
		<header
			className={`sticky top-0 z-50 w-full transition-all duration-500 ${
				isScrolled
					? "bg-[#874f9c]/95 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.18)]"
					: "bg-[#874f9c]"
			}`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16 lg:h-20">

					{/* LOGO */}
					<Link 
						to="/" 
						className="flex items-center gap-3 text-white group flex-shrink-0"
						aria-label="BRT Bus Service Home"
					>
						<div className="p-[2px] rounded-xl bg-white/20">
							<div className="bg-white/10 rounded-xl p-2 group-hover:bg-white/20 transition duration-300">
								<img
									src="/logo1.png"
									alt="BRT Bus Service Logo"
									className="w-10 h-10 lg:w-12 lg:h-12 object-contain"
									loading="lazy"
								/>
							</div>
						</div>
						<div className="flex flex-col hidden sm:flex">
							<span className="text-lg lg:text-xl font-semibold tracking-tight">
								BRT Bus Service
							</span>
							<span className="text-xs text-white/80">
								Your Journey, Our Priority
							</span>
						</div>
					</Link>

					{/* DESKTOP NAVIGATION */}
					<nav className="hidden lg:flex items-center gap-1">
						{navLinks.map(({ to, label, icon: Icon }) => {
							const active = isActive(to);
							return (
								<Link
									key={to}
									to={to}
									className="relative px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:text-white transition-all duration-300 group flex items-center gap-2 hover:bg-white/10"
									aria-current={active ? "page" : undefined}
								>
									<Icon className="w-4 h-4 opacity-80 group-hover:opacity-100 transition" />
									<span className="relative z-10">{label}</span>
									<span
										className={`absolute bottom-[6px] left-1/2 h-[2px] bg-white rounded-full transition-all duration-300 ease-out ${
											active
												? "w-[70%] -translate-x-1/2"
												: "w-0 group-hover:w-[70%] group-hover:-translate-x-1/2"
										}`}
									/>
								</Link>
							);
						})}
					</nav>

					{/* RIGHT SECTION - LOGIN/PROFILE */}
					<div className="flex items-center gap-4">
						{/* DESKTOP PROFILE */}
						<div className="hidden lg:block">
							{!user ? (
								<Link
									to="/login"
									className="px-6 py-2.5 rounded-xl bg-white text-[#874f9c] font-semibold shadow-[0_8px_25px_rgba(255,255,255,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_12px_35px_rgba(255,255,255,0.35)]"
								>
									Login
								</Link>
							) : (
								<div className="relative flex flex-col items-center gap-2" ref={profileRef}>
									{/* Avatar Button */}
									<button
										onClick={() => setIsProfileOpen(!isProfileOpen)}
										className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#874f9c] font-semibold text-sm hover:scale-110 transition-transform duration-300 shadow-lg border-2 border-white/30 hover:border-white focus:outline-none focus:ring-2 focus:ring-white/50"
										aria-expanded={isProfileOpen}
										aria-haspopup="true"
										title={user.displayName || "User Profile"}
									>
										{user.photoURL ? (
											<img
												src={user.photoURL}
												alt={user.displayName || "User"}
												className="w-full h-full rounded-full object-cover"
											/>
										) : (
											<span>{getInitials(user.displayName || "User")}</span>
										)}
									</button>

									{/* Username */}
									<span className="text-xs font-medium text-white whitespace-nowrap">
										{getShortName(user.displayName || "User")}
									</span>

									{/* Dropdown Menu */}
									{isProfileOpen && (
										<div className="absolute top-full mt-3 right-0 w-56 bg-white text-gray-800 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
											{/* User Info */}
											<div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
												<div className="flex items-center gap-3">
													<div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#874f9c] text-white font-semibold text-sm flex-shrink-0">
														{user.photoURL ? (
															<img
																src={user.photoURL}
																alt={user.displayName || "User"}
																className="w-full h-full rounded-full object-cover"
															/>
														) : (
															<span>{getInitials(user.displayName || "User")}</span>
														)}
													</div>
													<div className="min-w-0 flex-1">
														<p className="font-semibold text-sm text-gray-900 truncate">
															{user.displayName || "User"}
														</p>
														<p className="text-xs text-gray-600 truncate">
															{user.email}
														</p>
													</div>
												</div>
											</div>

											{/* Dashboard Link */}
											<button
												onClick={handleDashboardClick}
												className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 transition-colors duration-200 border-b border-gray-100"
											>
												<LayoutDashboard className="w-4 h-4 text-[#874f9c] flex-shrink-0" />
												<span>Dashboard</span>
											</button>

											{/* Logout Button */}
											<button
												onClick={handleLogout}
												disabled={isLoggingOut}
												className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<LogOut className="w-4 h-4 text-red-500 flex-shrink-0" />
												<span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
											</button>
										</div>
									)}
								</div>
							)}
						</div>

						{/* MOBILE MENU BUTTON */}
						<button
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							data-menu-trigger
							className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/50"
							aria-expanded={isMenuOpen}
							aria-label="Toggle navigation menu"
						>
							{isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
						</button>
					</div>

				</div>
			</div>

			{/* MOBILE NAVIGATION MENU */}
			{isMenuOpen && (
				<div className="lg:hidden fixed inset-0 top-16 bg-black/40 backdrop-blur-sm z-40" />
			)}

			<div
				ref={mobileMenuRef}
				className={`lg:hidden fixed inset-y-0 right-0 w-64 bg-[#874f9c] transform transition-transform duration-300 z-50 ${
					isMenuOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="flex flex-col h-full pt-20 pb-6 px-4 overflow-y-auto">

					{/* Navigation Links */}
					<nav className="space-y-1">
						{navLinks.map(({ to, label, icon: Icon }) => (
							<Link
								key={to}
								to={to}
								onClick={() => setIsMenuOpen(false)}
								className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
									isActive(to)
										? "bg-white/20 text-white"
										: "text-white/80 hover:bg-white/10 hover:text-white"
								}`}
								aria-current={isActive(to) ? "page" : undefined}
							>
								<Icon className="w-5 h-5" />
								{label}
							</Link>
						))}
					</nav>

					{/* User Section */}
					<div className="mt-auto pt-6 border-t border-white/20">
						{!user ? (
							<Link
								to="/login"
								onClick={() => setIsMenuOpen(false)}
								className="w-full flex justify-center px-5 py-3 rounded-xl bg-white text-[#874f9c] font-semibold transition-transform duration-200 hover:scale-105 active:scale-95"
							>
								Login
							</Link>
						) : (
							<>
								{/* User Card */}
								<div className="flex items-center gap-3 px-4 py-3 mb-3 bg-white/10 rounded-lg">
									<div className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#874f9c] font-semibold text-sm flex-shrink-0">
										{user.photoURL ? (
											<img
												src={user.photoURL}
												alt={user.displayName || "User"}
												className="w-full h-full rounded-full object-cover"
											/>
										) : (
											<span>{getInitials(user.displayName || "User")}</span>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold text-white truncate">
											{getShortName(user.displayName || "User")}
										</p>
										<p className="text-xs text-white/70 truncate">
											{user.email}
										</p>
									</div>
								</div>

								{/* Dashboard Button */}
								<button
									onClick={handleDashboardClick}
									className="w-full flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-white/20 text-white font-semibold border border-white/30 hover:bg-white/30 transition-colors duration-200 mb-2 active:bg-white/40"
								>
									<LayoutDashboard className="w-4 h-4" />
									Dashboard
								</button>

								{/* Logout Button */}
								<button
									onClick={handleLogout}
									disabled={isLoggingOut}
									className="w-full flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-red-500/20 text-red-200 font-semibold border border-red-500/30 hover:bg-red-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:bg-red-500/40"
								>
									<LogOut className="w-4 h-4" />
									<span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
								</button>
							</>
						)}
					</div>

				</div>
			</div>
		</header>
	);
};

export default Header;
