import { MapPin, Phone, Clock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Logo & Tagline */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/assets/img/logo.png"
                alt="Galaxia Krupina"
                className="h-16 w-auto"
              />
              <span className="text-xl font-display font-bold text-white tracking-wide">
                GALAXIA
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Skvelé jedlo v centre Krupiny. Tradícia kvality už 25 rokov.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Kontakt
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-500" />
                Malý Rínok, Krupina
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-500" />
                <a href="tel:+421948953871" className="hover:text-white transition-colors">0948 953 871</a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500" />
                Po-Pia 09:30 - 13:30
              </li>
            </ul>
          </div>

          {/* Delivery phones */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Rozvoz
            </h3>
            <ul className="space-y-2 text-sm">
              <li>Banská Štiavnica, Dudince: <a href="tel:+421948953871" className="hover:text-white transition-colors">0948 953 871</a></li>
              <li>Zvolen: <a href="tel:+421949001656" className="hover:text-white transition-colors">0949 001 656</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Galaxia Krupina. Všetky práva vyhradené.
        </div>
      </div>
    </footer>
  )
}
