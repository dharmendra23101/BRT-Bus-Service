import Header from "@/components/Header";
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
	return (
		<div className="min-h-screen bg-[#f4f2ff] relative overflow-hidden">

			<Header />

			<main className="py-24 px-4 relative">

				<div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[750px] h-[750px] bg-purple-300/20 blur-[160px] rounded-full"></div>

				<div className="max-w-6xl mx-auto">

					<div className="relative rounded-[34px] bg-[#faf9ff] px-6 md:px-14 py-16 shadow-[0_30px_90px_rgba(0,0,0,0.06)]">

						<div className="absolute inset-0 rounded-[34px] bg-gradient-to-br from-purple-200/30 via-purple-100/20 to-transparent blur-3xl opacity-70"></div>

						<div className="relative">

							<div className="text-center mb-16">
								<h1 className="text-[40px] md:text-[48px] font-semibold tracking-tight text-[#6b4fa3] leading-[1.1]">
									Meet Our Team
								</h1>

								<p className="mt-5 text-[#7a6aa8] text-[15px] md:text-[16px] max-w-2xl mx-auto leading-relaxed">
									Our dedicated team members are here to assist you. Reach out anytime for support, collaboration, or queries.
								</p>
							</div>

							<div className="relative group">

								<div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-purple-300/30 via-purple-200/20 to-transparent blur-2xl opacity-60 group-hover:opacity-90 transition duration-700"></div>

								<div className="relative bg-white/90 backdrop-blur-xl rounded-[28px] p-8 md:p-12 border border-purple-100 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 group-hover:-translate-y-[3px] group-hover:shadow-[0_40px_100px_rgba(0,0,0,0.12)]">

									<div className="grid grid-cols-1 md:grid-cols-3 gap-8">

										{team.map((member) => (
											<div
												key={member.name}
												className="group/card relative rounded-[22px] p-[1px] bg-gradient-to-br from-purple-200/40 via-purple-100/30 to-transparent transition-all duration-300 hover:-translate-y-[6px]"
											>
												<div className="rounded-[22px] bg-white/95 backdrop-blur-xl p-6 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 group-hover/card:shadow-[0_25px_70px_rgba(0,0,0,0.08)]">

													<div className="absolute inset-0 rounded-[22px] opacity-0 group-hover/card:opacity-100 transition duration-500 bg-gradient-to-br from-purple-200/20 to-transparent"></div>

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