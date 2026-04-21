import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Calendar, Clock, Truck, ChefHat, ArrowRight } from 'lucide-react'

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
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Galaxia Obedy 3.0
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Inteligentný systém pre plánovanie dodávok obedov. 
              Žiadne košíky, žiadne checkouty - iba jednoduchý plán.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link
                  to="/menu"
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg bg-white text-primary-700 hover:bg-primary-50 transition-colors"
                >
                  Prejsť na menu
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg bg-white text-primary-700 hover:bg-primary-50 transition-colors"
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

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ako to funguje
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stavový model plánovania - jednoduchšie to už byť nemôže.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card p-6 text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tri jednoduché kroky
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pozrite si menu
              </h3>
              <p className="text-gray-600">
                Prehliadnite si jedálny lístok na nasledujúce dni.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nastavte počty
              </h3>
              <p className="text-gray-600">
                Kliknutím +/- upravte počty jedál pre jednotlivé dni.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Hotovo!
              </h3>
              <p className="text-gray-600">
                Vaše obedy budú doručené podľa plánu. Žiadny checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
