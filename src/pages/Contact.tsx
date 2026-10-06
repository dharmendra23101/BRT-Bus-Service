import Header from "@/components/Header";
import { useTranslation } from "@/contexts/LocaleContext";
import Footer from "@/components/Footer";
import ContactCard from "@/components/ContactCard";

const team = [
	{
		name: "Mukund Thakur",
		role: "Team Leader & Web Developer",
		emails: ["mukund.th04@gmail.com", "mukund23101@iiitnr.edu.in"],
		phone: "93404 49412",
	},
	{
		name: "Dharmendra Dhruw",
		role: "Web Developer",
		emails: ["dharmendra23101@iiitnr.edu.in"],
		phone: "62686 93848",
	},
	{
		name: "Ayush Deep",
		role: "ML Developer",
		emails: ["ayush23102@iiitnr.edu.in"],
		phone: "97700 98789",
	},
];

const Contact = () => {
	const { t } = useTranslation();
	return (
		<div className="min-h-screen bg-background relative overflow-hidden">

			<Header />

			<main id="main-content" tabIndex={-1} className="py-24 px-4 relative">

				<div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[750px] h-[750px] bg-primary/20 blur-[160px] rounded-full"></div>

				<div className="max-w-6xl mx-auto">

					<div className="relative rounded-[34px] bg-surface-raised px-6 md:px-14 py-16 shadow-[0_30px_90px_rgba(0,0,0,0.06)]">

						<div className="absolute inset-0 rounded-[34px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70"></div>

						<div className="relative">

							<div className="text-center mb-16">
								<h1 className="text-[40px] md:text-[48px] font-semibold tracking-tight text-primary-deep leading-[1.1]">
									{t("contact.title")}
								</h1>

								<p className="mt-5 text-muted-foreground text-[15px] md:text-[16px] max-w-2xl mx-auto leading-relaxed">
									{t("contact.intro")}
								</p>
							</div>

							<div className="relative group">

								<div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-primary/25 via-primary/15 to-transparent blur-2xl opacity-60 group-hover:opacity-90 transition duration-settle"></div>

								<div className="relative bg-white/90 backdrop-blur-xl rounded-[28px] p-8 md:p-12 border border-border shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-[transform,box-shadow] duration-state group-hover:-translate-y-[3px] group-hover:shadow-[0_40px_100px_rgba(0,0,0,0.12)]">

									<div className="grid grid-cols-1 md:grid-cols-3 gap-8">

										{team.map((member) => (
											<div
												key={member.name}
												className="group/card relative rounded-[22px] p-[1px] bg-gradient-to-br from-primary/25 via-primary/15 to-transparent transition-[transform,box-shadow] duration-state hover:-translate-y-[6px]"
											>
												<div className="rounded-[22px] bg-white/95 backdrop-blur-xl p-6 border border-border shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-transform duration-state group-hover/card:shadow-[0_25px_70px_rgba(0,0,0,0.08)]">

													<div className="absolute inset-0 rounded-[22px] opacity-0 group-hover/card:opacity-100 transition duration-settle bg-gradient-to-br from-primary/15 to-transparent"></div>

													<div className="relative">
														<ContactCard {...member} />
													</div>

												</div>
											</div>
										))}

									</div>

								</div>

							</div>

						</div>

					</div>

				</div>

			</main>

			<Footer />

		</div>
	);
};

export default Contact;