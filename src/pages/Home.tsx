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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
        <img
          src={heroBus}
          alt="BRT Bus"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/60 to-primary/80 flex items-center justify-center">
          <div className="text-center px-4 max-w-4xl">
            <h2
              key={animKey}
              className="text-white text-3xl md:text-5xl lg:text-6xl font-bold mb-4 overlay-text-animate"
            >
              {rotatingTexts[textIndex]}
            </h2>
            <p className="text-white/90 text-lg md:text-xl mt-4 animate-fade-in-up">
              Your Journey, Our Priority - Fast, Safe, and Reliable
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent"></div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`glass-card hover:scale-105 transition-transform duration-300 animate-fade-in-up animate-stagger-${idx + 1}`}
            >
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Available Buses Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
            Available Buses
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose from our scheduled bus services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buses.map((bus, idx) => (
            <div key={bus} className={`animate-fade-in-up animate-stagger-${idx + 1}`}>
              <RouteCard title={bus} stops={busStops} />
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;