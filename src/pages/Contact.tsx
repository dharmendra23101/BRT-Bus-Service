import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactCard from "@/components/ContactCard";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Login Page", to: "/login" },
];

const team = [
  {
    name: "Mukund Thakur",
    role: "Team Leader & web Developer",
    emails: ["mukund.th04@gmail.com", "mukund23101@iiitnr.edu.in"],
    phone: "93404 49412",
  },
  {
    name: "Dharmendra Dhruw",
    role: "web Developer",
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
    <div className="min-h-screen bg-background">

      <main className="py-10 px-4">
        <div className="brt-container">
          <h2 className="brt-section-title uppercase tracking-widest">Meet Our Team</h2>
          <p className="text-center text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            Our dedicated team members are here to assist you. Feel free to reach out!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member) => (
              <ContactCard key={member.name} {...member} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
