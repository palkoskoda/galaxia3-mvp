import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { User, LogOut, Menu as MenuIcon, ClipboardList } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const closeTimerRef = useRef<number | null>(null)

  const openAdminMenu = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setAdminMenuOpen(true)
  }

  const scheduleCloseAdminMenu = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = window.setTimeout(() => {
      setAdminMenuOpen(false)
      closeTimerRef.current = null
    }, 140)
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'staff' || isAdmin

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src="/assets/img/logo.png"
                alt="Galaxia Krupina"
                className="h-12 w-auto"
              />
              <span className="hidden sm:block text-xl font-display font-bold text-gray-900 tracking-wide">
                GALAXIA
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link
              to="/menu"
              className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Jedálny lístok
            </Link>
            {isAuthenticated ? (
              <>
                {/* Customer links */}
                <Link
                  to="/moj-plan"
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Môj plán
                </Link>
                <Link
                  to="/historia"
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  História
                </Link>

                {/* Admin links */}
                {isStaff && (
                  <div
                    className="relative"
                    onMouseEnter={openAdminMenu}
                    onMouseLeave={scheduleCloseAdminMenu}
                  >
                    <button
                      className="text-primary-600 hover:text-primary-700 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                      onClick={() => setAdminMenuOpen((v) => !v)}
                    >
                      <ClipboardList className="w-4 h-4 mr-1" />
                      Admin
                    </button>

                    {adminMenuOpen && (
                      <>
                        <div className="absolute right-0 top-full h-3 w-48 z-40" />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                          {isAdmin && (
                            <>
                              <Link
                                to="/admin"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => setAdminMenuOpen(false)}
                              >
                                Dashboard
                              </Link>
                              <Link
                                to="/admin/menu"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => setAdminMenuOpen(false)}
                              >
                                Správa menu
                              </Link>
                              <Link
                                to="/admin/pouzivatelia"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => setAdminMenuOpen(false)}
                              >
                                Používatelia
                              </Link>
                            </>
                          )}
                          <Link
                            to="/admin/suviska"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Denná súpiska
                          </Link>
                          <Link
                            to="/admin/prijem-objednavok"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Prijať objednávku
                          </Link>
                          <Link
                            to="/admin/rozvoz"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Rozvozová trasa
                          </Link>
                          <Link
                            to="/admin/uzamknutia"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Uzamknutia
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* User menu */}
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                  <Link
                    to="/profil"
                    className="text-gray-600 hover:text-primary-600 flex items-center space-x-1 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{user?.firstName}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Prihlásenie
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Registrácia
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-primary-600 p-2 transition-colors"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/menu"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                >
                  Jedálny lístok
                </Link>
                <Link
                  to="/moj-plan"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                >
                  Môj plán
                </Link>
                <Link
                  to="/historia"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                >
                  História
                </Link>
                {isStaff && (
                  <>
                    <div className="px-3 py-2 text-sm font-medium text-primary-600">
                      Admin
                    </div>
                    <Link
                      to="/admin/suviska"
                      className="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Denná súpiska
                    </Link>
                    <Link
                      to="/admin/prijem-objednavok"
                      className="block pl-6 pr-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Prijať objednávku
                    </Link>
                  </>
                )}
                <Link
                  to="/profil"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  Profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50"
                >
                  Odhlásiť sa
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/menu"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                >
                  Jedálny lístok
                </Link>
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                >
                  Prihlásenie
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-primary-600 hover:bg-gray-50"
                >
                  Registrácia
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
