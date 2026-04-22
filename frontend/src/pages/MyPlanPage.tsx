import { useEffect, useState } from 'react'
import { usePlanStore } from '../stores/planStore'
import { useAuthStore } from '../stores/authStore'
import { formatDateWithDay, formatDateShort } from '@/utils/date'
import { Calendar, Package, Euro, MapPin, Edit, AlertCircle, CheckCircle } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function MyPlanPage() {
  const { user, updateProfile } = useAuthStore()
  const { myPlan, isLoading, fetchMyPlan } = usePlanStore()
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [tempAddress, setTempAddress] = useState(user?.address || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchMyPlan()
  }, [fetchMyPlan])

  const handleSaveAddress = async () => {
    setIsSaving(true)
    try {
      await updateProfile({ address: tempAddress })
      toast.success('Adresa bola uložená')
      setIsEditingAddress(false)
    } catch (error) {
      toast.error('Nepodarilo sa uložiť adresu')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const dates = myPlan ? Object.keys(myPlan).sort() : []
  const totalMeals = dates.reduce((sum, date) => sum + myPlan![date].items.reduce((s, item) => s + item.quantity, 0), 0)
  const totalPrice = dates.reduce((sum, date) => sum + myPlan![date].totalPrice, 0)
  const hasAddress = !!user?.address

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Môj plán dodávok</h1>
          <p className="text-gray-600 mt-2">
            Prehľad vašich objednaných obedov a adresy doručenia.
          </p>
        </div>

        {/* Delivery Address Card */}
        <div className={`card mb-6 ${!hasAddress ? 'border-2 border-orange-400' : ''}`}>
          <div className="card-header border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Adresa doručenia</h2>
              {!hasAddress && (
                <span className="badge-orange text-xs">Chýba adresa!</span>
              )}
            </div>
            {!isEditingAddress && (
              <button
                onClick={() => setIsEditingAddress(true)}
                className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-sm"
              >
                <Edit className="w-4 h-4" />
                Upraviť
              </button>
            )}
          </div>
          <div className="card-body">
            {!hasAddress && !isEditingAddress && (
              <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-800 font-medium">Nemáte nastavenú adresu doručenia</p>
                  <p className="text-orange-600 text-sm mt-1">
                    Pre správne doručenie obedov prosím zadajte vašu adresu.
                  </p>
                </div>
              </div>
            )}

            {isEditingAddress ? (
              <div className="space-y-3">
                <textarea
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Zadajte adresu doručenia (ulica, číslo, mesto, PSČ)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAddress}
                    disabled={isSaving || !tempAddress.trim()}
                    className="btn-primary btn-sm"
                  >
                    {isSaving ? 'Ukladám...' : 'Uložiť adresu'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingAddress(false)
                      setTempAddress(user?.address || '')
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Zrušiť
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                {hasAddress ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900 font-medium">{user?.address}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Táto adresa bude použitá pre všetky vaše objednávky.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 italic">
                    Kliknite na "Upraviť" pre pridanie adresy.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Dní s objednávkou</p>
                <p className="text-2xl font-bold text-gray-900">{dates.length}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Celkom jedál</p>
                <p className="text-2xl font-bold text-gray-900">{totalMeals}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <Euro className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Celková cena</p>
                <p className="text-2xl font-bold text-primary-600">{totalPrice.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan details */}
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date} className="card">
              <div className="card-header border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {formatDateWithDay(date)}
                    </h2>
                    <p className="text-sm text-gray-500">{formatDateShort(date)}</p>
                  </div>
                  <span className="text-lg font-bold text-primary-600">
                    {myPlan![date].totalPrice.toFixed(2)} €
                  </span>
                </div>
              </div>
              <div className="card-body">
                {/* Show delivery address for this day */}
                {hasAddress && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Doručenie na: <span className="font-medium text-gray-900">{user?.address}</span>
                    </span>
                  </div>
                )}
                
                <div className="space-y-2">
                  {myPlan![date].items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="font-medium text-gray-900">
                          {item.dailyMenu.menuItem.name}
                        </span>
                        <span className="text-gray-500 ml-2">
                          × {item.quantity}
                        </span>
                      </div>
                      <span className="text-gray-600">
                        {(item.quantity * item.dailyMenu.menuItem.price).toFixed(2)} €
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {dates.length === 0 && (
            <div className="card p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Zatiaľ nemáte žiadne objednávky
              </h3>
              <p className="text-gray-500">
                Prejdite do jedálneho lístku a začnite plánovať svoje obedy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
