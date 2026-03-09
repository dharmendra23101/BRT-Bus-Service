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

      <main className="py-10 px-4">

        <div className="max-w-4xl mx-auto">

          <h2 className="text-2xl font-bold mb-8 text-center">
            Fare Structure
          </h2>

          <div className="bg-white p-6 rounded shadow">

            {fares.map((f, i) => (
              <div
                key={i}
                className="flex justify-between border-b py-3"
              >
                <span>{f.destination}</span>
                <span className="font-bold">{f.price}</span>
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