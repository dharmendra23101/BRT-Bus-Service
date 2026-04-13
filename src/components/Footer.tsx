import { Bus, Mail, Phone, MapPin, Facebook, Twitter, Instagram, User } from "lucide-react";

interface FooterProps {
  text?: string;
}

const contacts = [
  {
    name: "Ayush Deep",
    emails: ["ayush23102@iiitnr.edu.in"],
    phone: "97700 98789",
  },
  {
    name: "Dharmendra Dhruw",
    emails: ["dharmendra23101@iiitnr.edu.in"],
    phone: "62686 93848",
  },
  {
    name: "Mukund Thakur",
    emails: ["mukund.th04@gmail.com", "mukund23101@iiitnr.edu.in"],
    phone: "93404 49412",
  },
];

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
            <div className="space-y-4">
              {contacts.map((contact, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2 text-primary-foreground font-medium text-sm">
                    <User className="w-3.5 h-3.5" />
                    <span>{contact.name}</span>
                  </div>
                  <div className="ml-5 space-y-1">
                    {contact.emails.map((email, emailIndex) => (
                      <div key={emailIndex} className="flex items-center gap-2 text-primary-foreground/80 text-xs">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                          {email}
                        </a>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-primary-foreground/80 text-xs">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:+91${contact.phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors">
                        +91 {contact.phone}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media & Location */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Follow Us</h4>
            <div className="flex gap-3 mb-4">
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
            <div className="flex items-start gap-2 text-primary-foreground/80 text-sm mt-4">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Sector 27, IIIT Naya Raipur, Chhattisgarh</span>
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