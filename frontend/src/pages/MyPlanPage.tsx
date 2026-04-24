import { useEffect, useState } from 'react'
import { usePlanStore } from '../stores/planStore'
import { useAuthStore } from '../stores/authStore'
import { planApi } from '../services/api'
import { formatDateWithDay, formatDateShort } from '@/utils/date'
import { Calendar, Package, Euro, MapPin, Edit, RotateCcw } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function MyPlanPage() {
  const { user } = useAuthStore()
  const { myPlan, isLoading, fetchMyPlan } = usePlanStore()
  const [editingPlanAddress, setEditingPlanAddress] = useState<string | null>(null)
  const [tempPlanAddress, setTempPlanAddress] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchMyPlan()
  }, [fetchMyPlan])

  const handleSavePlanAddress = async (planId: string) => {
    setIsSaving(true)
    try {
      await planApi.updateDeliveryAddress(planId, tempPlanAddress)
      await fetchMyPlan()
      toast.success('Adresa pre objednávku bola uložená')
      setEditingPlanAddress(null)
      setTempPlanAddress('')
    } catch {
      toast.error('Nepodarilo sa uložiť adresu objednávky')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPlanAddress = async (planId: string) => {
    setIsSaving(true)
    try {
      await planApi.resetDeliveryAddress(planId)
      await fetchMyPlan()
      toast.success('Objednávka znovu používa default adresu')
    } catch {
      toast.error('Nepodarilo sa resetnúť adresu objednávky')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyDefaultForDay = async (date: string) => {
    setIsSaving(true)
    try {
      const response = await planApi.applyDefaultAddressForDay(date)
      await fetchMyPlan()
      toast.success(`Resetované objednávky pre deň: ${response.data.data?.updatedCount ?? 0}`)
    } catch {
      toast.error('Nepodarilo sa použiť default adresu pre celý deň')
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
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {formatDateWithDay(date)}
                    </h2>
                    <p className="text-sm text-gray-500">{formatDateShort(date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary-600 block">
                      {myPlan![date].totalPrice.toFixed(2)} €
                    </span>
                    <button
                      onClick={() => handleApplyDefaultForDay(date)}
                      disabled={isSaving}
                      className="text-xs text-primary-600 hover:text-primary-800 mt-1"
                    >
                      Použiť profilovú adresu pre celý deň
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {myPlan![date].items.map((item) => (
                    <div key={item.id} className="py-2 border-b border-gray-100 last:border-0">
                      <div className="flex justify-between items-center mb-2">
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

                      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          {editingPlanAddress === item.id ? (
                            <>
                              <textarea
                                value={tempPlanAddress}
                                onChange={(e) => setTempPlanAddress(e.target.value)}
                                className="input w-full mb-2"
                                rows={2}
                                placeholder="Adresa pre túto objednávku"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleSavePlanAddress(item.id)} disabled={isSaving} className="btn-primary btn-sm">
                                  Uložiť
                                </button>
                                <button onClick={() => { setEditingPlanAddress(null); setTempPlanAddress('') }} className="btn-secondary btn-sm">
                                  Zrušiť
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-gray-600">
                                    Doručenie na: <span className="font-medium text-gray-900">{item.deliveryAddress || user?.address || 'Bez adresy'}</span>
                                  </span>
                                  {item.deliveryAddress ? (
                                    <span className="badge-purple text-xs">iné miesto</span>
                                  ) : (
                                    <span className="badge-gray text-xs">profil</span>
                                  )}
                                </div>
                                {item.deliveryAddress && user?.address && item.deliveryAddress !== user.address && (
                                  <p className="text-xs text-orange-700 mt-1">Táto objednávka sa doručí inde než profilová adresa.</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                <button
                                  onClick={() => { setEditingPlanAddress(item.id); setTempPlanAddress(item.deliveryAddress || user?.address || '') }}
                                  className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-sm whitespace-nowrap"
                                >
                                  <Edit className="w-4 h-4" /> Zmeniť adresu
                                </button>
                                {item.deliveryAddress && (
                                  <button
                                    onClick={() => handleResetPlanAddress(item.id)}
                                    className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm whitespace-nowrap"
                                  >
                                    <RotateCcw className="w-4 h-4" /> Použiť profilovú adresu
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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
