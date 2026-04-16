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
		<div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] via-[#f3efff] to-[#ede9fe] relative overflow-hidden">

			<Header />

			<main className="py-24 px-4 relative">

				<div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-300/20 blur-[140px] rounded-full"></div>

				<div className="max-w-6xl mx-auto relative">

					<div className="text-center mb-16">
						<h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#6b4fa3]">
							Meet Our Team
						</h1>

						<p className="mt-5 text-gray-600 text-[15px] md:text-base max-w-2xl mx-auto leading-relaxed">
							Our dedicated team members are here to assist you. Reach out anytime for support, collaboration, or queries.
						</p>
					</div>

					<div className="relative group">

						<div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-purple-300/30 via-purple-200/20 to-transparent blur-3xl opacity-60 group-hover:opacity-90 transition duration-700"></div>

						<div className="relative bg-white/85 backdrop-blur-2xl rounded-[32px] p-8 md:p-12 border border-white/50 shadow-[0_25px_70px_rgba(0,0,0,0.08)] transition-all duration-500 group-hover:-translate-y-[4px] group-hover:shadow-[0_45px_120px_rgba(0,0,0,0.12)]">

							<div className="grid grid-cols-1 md:grid-cols-3 gap-8">

								{team.map((member, i) => (
									<div
										key={member.name}
										className="relative rounded-2xl p-6 bg-gradient-to-br from-white to-purple-50/60 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
									>
										<div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition duration-500 bg-gradient-to-br from-purple-200/20 to-transparent"></div>

										<div className="relative">
											<ContactCard {...member} />
										</div>
									</div>
								))}

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