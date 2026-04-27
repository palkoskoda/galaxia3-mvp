import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Calendar, Clock, Truck, ChefHat, ArrowRight, Phone, MapPin, Mail, Utensils, Building2 } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated } = useAuthStore()

  const features = [
    {
      icon: Calendar,
      title: 'Plánujte dopredu',
      description: 'Objednávajte obedy na niekoľko dní dopredu podľa svojho rozvrhu.',
    },
    {
      icon: Clock,
      title: 'Živý plán',
      description: 'Upravujte počty jedál priamo v jedálnom lístku - okamžite a záväzne.',
    },
    {
      icon: Truck,
      title: 'Doručenie',
      description: 'Obedy vám doručíme priamo na adresu vždy včas.',
    },
    {
      icon: ChefHat,
      title: 'Čerstvé jedlá',
      description: 'Každý deň pripravujeme čerstvé a chutné jedlá z kvalitných surovín.',
    },
  ]

  return (
    <div className="bg-white">
      {/* Hero Section - Galaxia Style */}
      <div
        className="relative"
        style={{
          background: 'url(/assets/img/bg/herog2.jpg) no-repeat center/cover',
          minHeight: '380px',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center">
          <div className="text-center">
            <img
              src="/assets/img/logo.png"
              alt="Galaxia Krupina"
              className="h-24 w-auto mx-auto mb-6 drop-shadow-lg"
            />
            <h1
              className="text-5xl md:text-7xl font-logo text-white mb-4 tracking-wider"
              style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.7)' }}
            >
              Vitajte v Galaxii
            </h1>
            <p
              className="text-xl md:text-2xl text-white/90 font-display font-semibold tracking-wide"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}
            >
              Skvelé jedlo v centre Krupiny
            </p>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-primary-600 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Malý Rínok, Krupina
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Po-Pia 09:30 - 13:30
            </span>
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <a href="tel:+421948953871" className="hover:underline">0948 953 871</a>
            </span>
          </div>
        </div>
      </div>

      {/* Welcome Section - copied from original */}
      <section className="py-16 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-4xl md:text-5xl font-logo text-primary-600 block mb-4">
              Skvelé jedlo v centre Krupiny
            </span>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Nájdete nás na Malom Rínku v Krupine
            </p>
            <p className="text-gray-500 mt-1">
              Každý pracovný deň 09:30 - 13:30
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Images */}
            <div className="hidden lg:block relative">
              <div className="relative mx-auto w-80 h-80">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary-300 animate-spin-slow"
                  style={{ animationDuration: '20s' }}
                />
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                  <div className="bg-white rounded-xl shadow-lg p-2 w-48">
                    <img
                      src="/assets/img/process/process-2-1.jpg"
                      alt="Galaxia jedlo"
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4">
                  <div className="bg-white rounded-xl shadow-lg p-2 w-48">
                    <img
                      src="/assets/img/process/process-2-2.jpg"
                      alt="Galaxia jedlo"
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-primary-600 text-white rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-xl">
                    <span className="text-xs font-medium text-center px-2">Tradícia</span>
                    <span className="text-lg font-bold">25 rokov</span>
                    <span className="text-xs font-medium text-center px-2">kvalitné jedlo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Delivery info */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-display font-bold text-gray-900 mb-3">
                  Rozvoz Banská Štiavnica, Dudince, Dobrá Niva
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421948953871" className="hover:text-primary-600 font-semibold">0948 953 871</a> (aj SMS)
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421949000540" className="hover:text-primary-600 font-semibold">0949 000 540</a>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Obedy na rozvoz je možné objednávať deň dopredu do 14:30, telefonicky.
                    V aktuálny deň možnosť objednania do 8:00 len menu D.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-display font-bold text-gray-900 mb-3">
                  Rozvoz Zvolen
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421949001656" className="hover:text-primary-600 font-semibold">0949 001 656</a> (aj SMS)
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421948417189" className="hover:text-primary-600 font-semibold">0948 417 189</a>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Obedy na rozvoz je možné objednávať deň dopredu do 14:30, telefonicky.
                    V aktuálny deň možnosť objednania do 8:00 len menu D.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Menu Preview */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-4xl md:text-5xl font-logo text-primary-600 block mb-4">
              Galaxia týždenné menu
            </span>
            <p className="text-lg text-gray-600">
              V deň rozvozu je možné do 8:00 objednať len menu D
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="hidden md:block">
              <img
                src="/assets/img/menu/menu-2-1.jpg"
                alt="Menu"
                className="rounded-xl shadow-lg w-full h-80 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            <div className="text-center space-y-6">
              <Utensils className="w-16 h-16 text-primary-600 mx-auto" />
              <h3 className="text-2xl font-display font-bold text-gray-900">
                Aktuálny jedálny lístok
              </h3>
              <p className="text-gray-600">
                Prezrite si našu aktuálnu ponuku obedov na najbližšie dni.
                Polievka, menu A, B, C, D a extra obloha.
              </p>
              <Link
                to="/menu"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                Zobraziť menu
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>

            <div className="hidden md:block">
              <img
                src="/assets/img/menu/menu-2-2.jpg"
                alt="Menu"
                className="rounded-xl shadow-lg w-full h-80 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Závodné stravovanie */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-4xl md:text-5xl font-logo text-primary-600 block mb-6">
            Závodné stravovanie
          </span>
          <Building2 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700 mb-4">
            <strong>Hľadáte dodávateľa stravy pre vašich zamestnancov?</strong>
          </p>
          <p className="text-gray-600">
            Naša prevádzka je vybavená dostatočnou kapacitou na prípravu stravy aj pre spoločnosti s väčším počtom pracovníkov.
            Ponúkame kompletný servis vrátane dodávky stravy do Vašej výdajne, výdaja, ale aj dodávky balenej stravy (PP misky, režónové antikórové nádoby).
            Cena stravnej jednotky ako aj ostatné podmienky sa dojednávajú dohodou.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-3">
              Ako to funguje
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stavový model plánovania - jednoduchšie to už byť nemôže.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-display font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-50" id="kontakt">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-4xl md:text-5xl font-logo text-primary-600 block mb-4">
              Prevádzkové údaje
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-gray-700">
                  <strong>Galaxia, s.r.o.</strong><br />
                  Námestie SNP 130<br />
                  963 01 Krupina
                </p>
                <p className="text-gray-700">
                  <strong>Otváracie hodiny:</strong><br />
                  Po – Pi: 09:30 – 13:30
                </p>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-primary-600" />
                  <a href="mailto:galaxia.obedy@gmail.com" className="text-primary-600 hover:underline">galaxia.obedy@gmail.com</a>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Banská Štiavnica, Dudince, Dobrá Niva</p>
                  <p className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421949000540" className="hover:text-primary-600">0949 000 540</a>
                  </p>
                  <p className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421948953871" className="hover:text-primary-600">0948 953 871</a>
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Zvolen</p>
                  <p className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421949001656" className="hover:text-primary-600">0949 001 656</a>
                  </p>
                  <p className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-primary-600" />
                    <a href="tel:+421948417189" className="hover:text-primary-600">0948 417 189</a>
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  <strong>Konatelia:</strong> Matej Mitter - 0903 523 990, Mgr. Ján Lapin - 0905 262 165
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <div className="relative bg-primary-700 py-16">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'url(/assets/img/bg/herog2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Pripravení objednať?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Žiadne košíky, žiadne checkouty - iba jednoduchý plán.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link
                to="/menu"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg bg-white text-primary-700 hover:bg-gray-100 transition-colors"
              >
                Prejsť na menu
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg bg-white text-primary-700 hover:bg-gray-100 transition-colors"
                >
                  Začať plánovať
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg border-2 border-white text-white hover:bg-white/10 transition-colors"
                >
                  Prihlásiť sa
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
