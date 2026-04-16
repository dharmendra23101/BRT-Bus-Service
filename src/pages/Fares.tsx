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
    <div className="min-h-screen">

      <Header />

      <main className="spacing-xl px-4">

        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14">
            <h1 className="text-hero">Fare Details</h1>
            <p className="subtext mt-4">
              Explore the affordable bus fares from HNLU to various destinations.
              Enjoy a comfortable and convenient travel experience.
            </p>
          </div>

          <div className="card-main p-8 md:p-10 soft-glow">

            <h2 className="text-[20px] md:text-[22px] font-medium text-primary mb-6">
              From HNLU to:
            </h2>

            <div className="gradient-divider mb-6"></div>

            <div className="space-y-2">

              {fares.map((f, i) => (
                <div key={i} className="flex justify-between items-center hover-row">
                  <span className="text-[15px] md:text-[16px] text-gray-700">
                    {f.destination}
                  </span>
                  <span className="text-primary font-semibold text-[16px] md:text-[18px]">
                    {f.price}
                  </span>
                </div>
              ))}

            </div>

          </div>

        </div>

      </main>

      <Footer />

    </div>
  );
};

export default Fares;