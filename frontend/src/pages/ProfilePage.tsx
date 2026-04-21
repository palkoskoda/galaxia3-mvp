import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { User, Mail, Phone, MapPin, Save } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: user?.address || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfile(formData)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Môj profil</h1>
          <p className="text-gray-600 mt-2">
            Spravujte svoje osobné údaje a adresu doručenia.
          </p>
        </div>

        <div className="card">
          <div className="card-header border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Osobné údaje</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Meno</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Priezvisko</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="input pl-10 bg-gray-50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Email nie je možné zmeniť.</p>
              </div>

              <div>
                <label className="label">Telefón</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input pl-10"
                    placeholder="+421 900 000 000"
                  />
                </div>
              </div>

              <div>
                <label className="label">Adresa doručenia</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input pl-10"
                    placeholder="Ulica 123, Mesto"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <span className="badge-blue">
                    {user?.role === 'admin' ? 'Administrátor' : user?.role === 'staff' ? 'Personál' : 'Zákazník'}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Uložiť zmeny
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
