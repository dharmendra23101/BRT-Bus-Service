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
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] via-[#f3efff] to-[#ede9fe] relative overflow-hidden">

      <Header />

      <main className="py-24 px-4 relative">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-300/20 blur-[120px] rounded-full"></div>

        <div className="max-w-5xl mx-auto relative">

          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#6b4fa3]">
              Fare Details
            </h1>

            <p className="mt-5 text-gray-600 text-[15px] md:text-base max-w-xl mx-auto leading-relaxed">
              Explore the affordable bus fares from HNLU to various destinations.
              Enjoy a comfortable and convenient travel experience.
            </p>
          </div>

          <div className="relative group">

            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-purple-300/30 via-purple-200/20 to-transparent blur-3xl opacity-60 group-hover:opacity-90 transition duration-700"></div>

            <div className="relative bg-white/85 backdrop-blur-2xl rounded-[32px] p-8 md:p-12 border border-white/50 shadow-[0_25px_70px_rgba(0,0,0,0.08)] transition-all duration-500 group-hover:-translate-y-[4px] group-hover:shadow-[0_45px_120px_rgba(0,0,0,0.12)]">

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg md:text-xl font-semibold text-[#6b4fa3] tracking-wide">
                  From HNLU to
                </h2>
                <div className="h-[6px] w-[6px] rounded-full bg-purple-400 shadow-[0_0_20px_rgba(167,139,250,0.8)]"></div>
              </div>

              <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-300 to-transparent mb-8"></div>

              <div className="space-y-3">

                {fares.map((f, i) => (
                  <div
                    key={i}
                    className="relative flex justify-between items-center px-6 py-5 rounded-xl transition-all duration-300 ease-out hover:bg-purple-50/90 hover:scale-[1.012] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
                  >
                    <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition duration-500 bg-gradient-to-r from-purple-200/20 to-transparent"></div>

                    <span className="relative text-gray-700 text-[15px] md:text-[16px] leading-relaxed">
                      {f.destination}
                    </span>

                    <span className="relative text-[#6b4fa3] font-semibold text-[16px] md:text-[18px] tracking-wide">
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