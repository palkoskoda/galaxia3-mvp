import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(formData)
      navigate('/menu')
    } catch (error) {
      // Error handled in store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Registrácia</h2>
          <p className="mt-2 text-sm text-gray-600">
            Už máte účet?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Prihláste sa
            </Link>
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="label">
                    Meno
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="input pl-10"
                      placeholder="Ján"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="label">
                    Priezvisko
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input"
                    placeholder="Novák"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input pl-10"
                    placeholder="vas@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Heslo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="label">
                  Telefón
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input pl-10"
                    placeholder="+421 900 000 000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="label">
                  Adresa doručenia
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input pl-10"
                    placeholder="Ulica 123, Mesto"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary mt-6"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Zaregistrovať sa'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
