import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useState, useEffect } from "react";
import { Home, MapPin, Clock, DollarSign, Phone, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
const Header = () => {
	const location = useLocation();
	const { user, role, logout } = useUser();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const isActive = (path: string) => location.pathname === path;

	const navLinks = [
		{ to: "/", label: "Home", icon: MapPin },
		{ to: "/map", label: "Live Map", icon: MapPin },
		{ to: "/timetable", label: "Time Table", icon: Clock },
		{ to: "/fares", label: "Bus Fares", icon: DollarSign },
		{ to: "/contact", label: "Contact Us", icon: Phone },
	];

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

					<Link to="/" className="flex items-center gap-3 text-white group">
						<div className="p-[2px] rounded-xl bg-white/20">
							<div className="bg-white/10 rounded-xl p-2 group-hover:bg-white/20 transition duration-300">
								<img
									src="/logo1.png"
									alt="logo"
									className="w-10 h-10 lg:w-12 lg:h-12 object-contain"
								/>
							</div>
						</div>
						<div className="flex flex-col">
							<span className="text-lg lg:text-xl font-semibold tracking-tight">
								BRT Bus Service
							</span>
							<span className="text-xs text-white/80 hidden sm:block">
								Your Journey, Our Priority
							</span>
						</div>
					</Link>

					<nav className="hidden lg:flex items-center gap-2">

						{navLinks.map(({ to, label, icon: Icon }) => {
							const active = isActive(to);
							return (
								<Link
									key={to}
									to={to}
									className="relative px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:text-white transition-all duration-300 group flex items-center gap-2 hover:bg-white/10"
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

						{user && (
							<Link
								to="/dashboard"
								className="relative px-4 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:text-white transition-all duration-300 group flex items-center gap-2 hover:bg-white/10"
							>
								<LayoutDashboard className="w-4 h-4" />
								<span>Dashboard</span>
								<span
									className={`absolute bottom-[6px] left-1/2 h-[2px] bg-white rounded-full transition-all duration-300 ${
										isActive("/dashboard")
											? "w-[70%] -translate-x-1/2"
											: "w-0 group-hover:w-[70%] group-hover:-translate-x-1/2"
									}`}
								/>
							</Link>
						)}

						<div className="ml-4 flex items-center gap-3">

							{!user ? (
								<Link
									to="/login"
									className="px-5 py-2.5 rounded-xl bg-white text-[#6b4fa3] font-semibold shadow-[0_8px_25px_rgba(255,255,255,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_12px_35px_rgba(255,255,255,0.35)]"
								>
									Login
								</Link>
							) : (
								<button
									onClick={logout}
									className="px-5 py-2.5 rounded-xl border border-white/30 text-white bg-white/10 backdrop-blur transition-all duration-300 hover:bg-white/20 hover:-translate-y-[2px] flex items-center gap-2"
								>
									<LogOut className="w-4 h-4" />
									Logout
								</button>
							)}

						</div>

					</nav>

					<button
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition"
					>
						{isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
					</button>

				</div>
			</div>

			<div
				className={`lg:hidden fixed inset-y-0 right-0 w-64 bg-[#874f9c] transform transition-transform duration-300 ${
					isMenuOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="flex flex-col h-full pt-20 pb-6 px-4">

					{navLinks.map(({ to, label }) => (
						<Link
							key={to}
							to={to}
							className={`px-4 py-3 rounded-lg text-sm font-medium mb-1 ${
								isActive(to)
									? "bg-white/20 text-white"
									: "text-white/80 hover:bg-white/10"
							}`}
						>
							{label}
						</Link>
					))}

					<div className="mt-auto pt-6 border-t border-white/20">

						{!user ? (
							<Link
								to="/login"
								className="w-full flex justify-center px-5 py-3 rounded-xl bg-white text-[#6b4fa3] font-semibold"
							>
								Login
							</Link>
						) : (
							<button
								onClick={logout}
								className="w-full flex justify-center px-5 py-3 rounded-xl bg-white/10 text-white border border-white/20"
							>
								Logout
							</button>
						)}

					</div>

				</div>
			</div>

			{isMenuOpen && (
				<div
					className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm"
					onClick={() => setIsMenuOpen(false)}
				/>
			)}
		</header>
	);
};

export default Header;