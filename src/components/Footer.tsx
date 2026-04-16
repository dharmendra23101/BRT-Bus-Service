import { Bus, MapPin, Facebook, Twitter, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

interface FooterProps {
  text?: string;
}

const Footer = ({ text = "© BRT Bus Services. All Rights Reserved." }: FooterProps) => {
  return (
    <footer className="bg-gradient-to-br from-[hsl(284,33%,36%)] to-[hsl(284,33%,28%)] text-primary-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-2 rounded-lg">
                <Bus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">BRT Bus Service</h3>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Your trusted partner for reliable and comfortable bus transportation services.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-primary-foreground/80 hover:text-white transition-colors duration-200">
                  Home
                </a>
              </li>
              <li>
                <a href="/map" className="text-primary-foreground/80 hover:text-white transition-colors duration-200">
                  Live Map
                </a>
              </li>
              <li>
                <a href="/timetable" className="text-primary-foreground/80 hover:text-white transition-colors duration-200">
                  Time Table
                </a>
              </li>
              <li>
                <a href="/fares" className="text-primary-foreground/80 hover:text-white transition-colors duration-200">
                  Bus Fares
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-primary-foreground/80 hover:text-white transition-colors duration-200">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Follow Us</h4>
            <div className="flex gap-3 mb-4">
              <a href="#" className="bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-110">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-110">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-110">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Location</h4>
            <div className="flex items-start gap-2 text-primary-foreground/80 text-sm mt-4">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Sector 24, IIIT Naya Raipur, Chhattisgarh</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-center text-primary-foreground/70 text-sm">{text}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;