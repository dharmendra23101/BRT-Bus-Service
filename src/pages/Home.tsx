import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteCard from "@/components/RouteCard";
import heroBus from "@/assets/Raipur-Naya_Raipur_BRTS.png";
import { Clock, MapPin, Shield, Zap } from "lucide-react";

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

const features = [
  {
    icon: Clock,
    title: "Real-Time Updates",
    description: "Track buses in real-time and get accurate arrival predictions",
  },
  {
    icon: MapPin,
    title: "Route Planning",
    description: "Plan your journey with detailed route information",
  },
  {
    icon: Shield,
    title: "Safe & Reliable",
    description: "Travel with confidence on our secure and maintained buses",
  },
  {
    icon: Zap,
    title: "Fast Service",
    description: "Quick and efficient transportation to your destination",
  },
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
    <div className="min-h-screen bg-[#f4f2ff]">

      <Header />

      <section className="relative w-full h-[420px] md:h-[520px] lg:h-[620px] overflow-hidden">

        <img
          src={heroBus}
          alt="BRT Bus"
          className="w-full h-full object-cover scale-[1.03]"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-[#874f9c]/80 via-[#874f9c]/70 to-[#5a3fa0]/85 flex items-center justify-center">

          <div className="text-center px-4 max-w-4xl">

            <h2
              key={animKey}
              className="text-white text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight drop-shadow-lg transition-all duration-700"
            >
              {rotatingTexts[textIndex]}
            </h2>

            <p className="text-white/90 text-lg md:text-xl mt-6 max-w-2xl mx-auto leading-relaxed">
              Your Journey, Our Priority — Fast, Safe, and Reliable
            </p>

          </div>

        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f4f2ff] to-transparent"></div>

      </section>

      <section className="py-20 px-4">

        <div className="max-w-7xl mx-auto">

          <div className="relative rounded-[32px] bg-[#faf9ff] px-6 md:px-12 py-14 shadow-[0_30px_90px_rgba(0,0,0,0.06)]">

            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-purple-200/30 via-purple-100/20 to-transparent blur-3xl opacity-70"></div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group rounded-[22px] p-[1px] bg-gradient-to-br from-purple-200/40 via-purple-100/30 to-transparent transition-all duration-300 hover:-translate-y-[6px]"
                >
                  <div className="rounded-[22px] bg-white/95 backdrop-blur-xl p-6 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 group-hover:shadow-[0_25px_70px_rgba(0,0,0,0.08)]">

                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-[#874f9c]" />
                    </div>

                    <h3 className="text-[17px] font-semibold text-[#874f9c] mb-2">
                      {feature.title}
                    </h3>

                    <p className="text-sm text-[#7a6aa8] leading-relaxed">
                      {feature.description}
                    </p>

                  </div>
                </div>
              ))}

            </div>

          </div>

        </div>

      </section>

      <section className="pb-24 px-4">

        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-[34px] md:text-[40px] font-semibold text-[#874f9c] tracking-tight">
              Available Buses
            </h2>

            <p className="text-[#7a6aa8] text-[15px] md:text-[16px] mt-3">
              Choose from our scheduled bus services
            </p>
          </div>

          <div className="relative rounded-[30px] bg-[#faf9ff] px-6 md:px-12 py-12 shadow-[0_25px_80px_rgba(0,0,0,0.06)]">

            <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-purple-200/30 via-purple-100/20 to-transparent blur-3xl opacity-70"></div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {buses.map((bus) => (
                <div
                  key={bus}
                  className="group transition-all duration-300 hover:-translate-y-[5px]"
                >
                  <RouteCard title={bus} stops={busStops} />
                </div>
              ))}

            </div>

          </div>

        </div>

      </section>

      <Footer />

    </div>
  );
};

export default Home;