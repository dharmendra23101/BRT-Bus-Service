import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/LocaleContext";
import { BRAND_NAME } from "@/constants/config";
import type { TranslationKey } from "@/domain/i18n/strings";

interface FooterProps {
	text?: string;
}

const FOOTER_LINKS = [
	{ to: "/", labelKey: "nav.home" },
	{ to: "/plan", labelKey: "nav.plan" },
	{ to: "/routes", labelKey: "nav.routes" },
	{ to: "/nearby", labelKey: "nav.nearbyPlaces" },
	{ to: "/map", labelKey: "nav.map" },
	{ to: "/timetable", labelKey: "nav.timetable" },
	{ to: "/fares", labelKey: "nav.fares" },
	{ to: "/search", labelKey: "nav.search" },
	{ to: "/about", labelKey: "nav.about" },
	{ to: "/contact", labelKey: "nav.contact" },
	{ to: "/help", labelKey: "nav.help" },
] as const satisfies readonly { to: string; labelKey: TranslationKey }[];

const Footer = ({ text }: FooterProps) => {
	const { t } = useTranslation();

	/*
		Defaulted here rather than in the signature, because the default is now
		translated and a parameter default is evaluated before the hook runs.
		A caller that passes its own text still wins.
	*/
	const rights = text ?? t("footer.rights");

	return (
		<footer className="bg-gradient-to-br from-primary to-primary-deep text-primary-foreground mt-auto">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
					{/* Brand Section */}
					<div className="space-y-4">
						<Link
							to="/"
							className="flex items-center gap-3 text-primary-foreground group"
						>
							<div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-colors duration-state">
								{/* Decorative: the brand name is right beside it. */}
								<img
									src="/logo1.png"
									alt=""
									aria-hidden="true"
									className="w-10 h-10 lg:w-12 lg:h-12 object-contain"
								/>
							</div>
							<div className="flex flex-col">
								<span className="text-lg lg:text-xl font-bold tracking-tight">
									{BRAND_NAME}
								</span>
								<span className="text-xs text-primary-foreground/90 hidden sm:block">
									{t("brand.tagline")}
								</span>
							</div>
						</Link>

						<p className="text-primary-foreground/90 text-sm leading-relaxed">
							{t("footer.blurb")}
						</p>
					</div>

					{/*
						Internal destinations use Link. The raw anchors these
						replaced triggered a full page reload, discarding the
						session and scroll position on every footer click.
					*/}
					<nav aria-labelledby="footer-links-heading">
						<h2 id="footer-links-heading" className="font-semibold text-lg mb-4">
							{t("footer.quickLinks")}
						</h2>
						<ul className="space-y-2 text-sm">
							{FOOTER_LINKS.map(({ to, labelKey }) => (
								<li key={to}>
									<Link
										to={to}
										className="text-primary-foreground/90 hover:text-white transition-colors duration-enter"
									>
										{t(labelKey)}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					<div>
						<h2 className="font-semibold text-lg mb-4">{t("footer.location")}</h2>
						<address className="flex items-start gap-2 text-primary-foreground/90 text-sm mt-4 not-italic">
							<MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
							<span>Sector 24, IIIT Naya Raipur, Chhattisgarh</span>
						</address>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="border-t border-white/10 pt-6">
					<p className="text-center text-primary-foreground/90 text-sm">
						{rights}
					</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
