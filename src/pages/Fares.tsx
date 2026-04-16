import Header from "@/components/Header";
import Footer from "@/components/Footer";

const fares = [
  {
    destination:
      "Balco Medical Centre, Sector 30, Sector 29, Sector 27",
    price: "₹ 5",
  },
  {
    destination:
      "Indravati Bhawan, Mahanadi Bhawan, North Block",
    price: "₹ 10",
  },
  {
    destination: "Telibandha",
    price: "₹ 30",
  },
  {
    destination: "Railway Station",
    price: "₹ 40",
  },
];

const Fares = () => {
  return (
    <div className="min-h-screen bg-background">

      <Header />

      <main className="py-16 px-4">

        <div className="max-w-4xl mx-auto">

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center tracking-wide text-primary">
            Fare Details
          </h2>

          {/* Glass Card */}
          <div className="bg-white/60 backdrop-blur-lg p-6 md:p-8 rounded-2xl shadow-xl border border-white/20">

            {fares.map((f, i) => (
              <div
                key={i}
                className="flex justify-between items-center px-4 py-4 rounded-lg transition-all duration-300 hover:bg-primary/10 hover:scale-[1.01] hover:shadow-md group"
              >
                {/* Destination */}
                <span className="text-sm md:text-base text-gray-700 group-hover:text-primary transition">
                  {f.destination}
                </span>

                {/* Price */}
                <span className="font-semibold text-primary text-lg transition-transform duration-300 group-hover:scale-110">
                  {f.price}
                </span>
              </div>
            ))}

          </div>

        </div>

      </main>

      <Footer />

    </div>
  );
};

export default Fares;