import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteCard from "@/components/RouteCard";
import heroBus from "@/assets/hero-bus.jpg";

const rotatingTexts = [
  "Experience the Best BRT Service",
  "Plan Your Commute with Ease",
  "Stay Informed About Routes & Fares",
  "Welcome to the Bus Tracker",
];

const busStops =
  "Balco, Sector 27, IIIM, Indrawati Bhawan, Telibandha, Railway Station";

const buses = [
  "BUS 1 - 7:25 AM Departure",
  "BUS 2 - 7:55 AM Departure",
  "BUS 3 - 8:25 AM Departure",
  "BUS 4 - 8:55 AM Departure",
  "BUS 5 - 9:25 AM Departure",
];

const Home = () => {
  const [textIndex, setTextIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % rotatingTexts.length);
      setAnimKey((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">

      <Header />

      <section className="relative w-full h-[400px] overflow-hidden">
        <img src={heroBus} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
          <h2
            key={animKey}
            className="text-white text-3xl md:text-4xl font-bold text-center"
          >
            {rotatingTexts[textIndex]}
          </h2>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10">

        <h2 className="text-xl font-bold mb-6 text-center">
          Available Buses
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {buses.map((bus) => (
            <RouteCard key={bus} title={bus} stops={busStops} />
          ))}

        </div>

      </section>

      <Footer />

    </div>
  );
};

export default Home;