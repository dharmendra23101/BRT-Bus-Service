import Header from "@/components/Header";
import Footer from "@/components/Footer";

const fares = [
  {
    destination:
      "Balco Medical Centre, Sector 30, Sector 29, Sector 27, and South Block",
    price: "₹ 5 /-",
  },
  {
    destination:
      "Indravati Bhawan, Mahanadi Bhawan, North Block, Ekatm Path, CBD, Sector 15",
    price: "₹ 10 /-",
  },
  {
    destination: "Telibandha",
    price: "₹ 30 /-",
  },
  {
    destination: "DKS Bhawan and Railway Station",
    price: "₹ 40 /-",
  },
];

const Fares = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f4ff] via-[#f1edff] to-[#ebe7ff]">

      <Header />

      <main className="py-24 px-4">

        <div className="max-w-5xl mx-auto">

          {/* Title Section */}
          <div className="text-center mb-14">
            <h1 className="text-[38px] md:text-[46px] font-semibold text-[#6b4fa3] tracking-[-0.02em] leading-tight drop-shadow-[0_2px_8px_rgba(107,79,163,0.15)]">
              Fare Details
            </h1>

            <p className="mt-4 text-gray-600 text-[15px] md:text-[16px] max-w-xl mx-auto leading-relaxed">
              Explore affordable fares from HNLU to key destinations.
              Designed for smooth, accessible, and reliable travel.
            </p>
          </div>

          {/* Premium Card */}
          <div className="relative group">

            {/* Glow Layer */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#c4b5fd]/20 to-transparent blur-2xl opacity-60 group-hover:opacity-80 transition duration-500"></div>

            {/* Main Card */}
            <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 md:p-10 border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 group-hover:-translate-y-[3px] group-hover:shadow-[0_30px_90px_rgba(0,0,0,0.12)]">

              {/* Section Heading */}
              <h2 className="text-[20px] md:text-[22px] font-medium text-[#6b4fa3] tracking-wide mb-6">
                From HNLU to:
              </h2>

              {/* Premium Divider */}
              <div className="h-[1px] bg-gradient-to-r from-transparent via-[#c4b5fd] to-transparent mb-6"></div>

              {/* Fare Rows */}
              <div className="space-y-2">

                {fares.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center px-5 py-4 rounded-xl transition-all duration-300 ease-out hover:bg-[#ede9fe]/70 hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                  >
                    <span className="text-gray-700 text-[14.5px] md:text-[15.5px] leading-relaxed">
                      {f.destination}
                    </span>

                    <span className="text-[#6b4fa3] font-semibold text-[16px] md:text-[18px] tracking-wide">
                      {f.price}
                    </span>
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

export default Fares;