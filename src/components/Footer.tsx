import { Bus, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from "lucide-react";

interface FooterProps {
  text?: string;
}

const Footer = ({ text = "© 2027 Bus Services. All Rights Reserved." }: FooterProps) => {
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
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Phone className="w-4 h-4" />
                <span>+1 xxxxx</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Mail className="w-4 h-4" />
                <span>info@brtbus.com</span>
              </li>
              <li className="flex items-start gap-2 text-primary-foreground/80">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span>sector 27, IIIT Naya Raipur, CG</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Follow Us</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
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