import { useState, useEffect } from 'react'
import { deliveryRoutesApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Truck, MapPin, CheckCircle, XCircle, Download, Play, RotateCcw } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čaká sa',
  preparing: 'Pripravuje sa',
  ready: 'Pripravené',
  loaded: 'Naložené',
  in_transit: 'Na ceste',
  delivered: 'Doručené',
  failed: 'Nedoručené',
  returned: 'Vrátené',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  loaded: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  returned: 'bg-orange-100 text-orange-800',
}

export default function AdminDeliveryRoutes() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [route, setRoute] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')

  const loadRoute = async (date: string = selectedDate) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await deliveryRoutesApi.getRoute(date)
      const data = response.data.data
      setRoute(data.route)
      setItems(data.items || [])
      if (data.route) {
        setDriverName(data.route.driverName || '')
        setDriverPhone(data.route.driverPhone || '')
        setVehicleInfo(data.route.vehicleInfo || '')
      }
    } catch (err: any) {
      console.error('Failed to load route:', err)
      setError(err.message || 'Nepodarilo sa načítať trasu')
    } finally {
      setIsLoading(false)
    }
  }

  const createRoute = async () => {
    try {
      setIsLoading(true)
      await deliveryRoutesApi.createRoute({
        date: selectedDate,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
        vehicleInfo: vehicleInfo || undefined,
      })
      await loadRoute()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nepodarilo sa vytvoriť trasu')
    } finally {
      setIsLoading(false)
    }
  }

  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      await deliveryRoutesApi.updateRouteItem(itemId, { deliveryStatus: status })
      await loadRoute()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa aktualizovať stav')
    }
  }

  const markDelivered = async (itemId: string) => {
    try {
      await deliveryRoutesApi.markDelivered(itemId)
      await loadRoute()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa označiť ako doručené')
    }
  }

  const markFailed = async (itemId: string) => {
    const reason = prompt('Dôvod nedoručenia:')
    if (!reason) return
    try {
      await deliveryRoutesApi.markFailed(itemId, reason)
      await loadRoute()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa označiť ako nedoručené')
    }
  }

  const exportRoute = async () => {
    try {
      const response = await deliveryRoutesApi.exportRoute(selectedDate)
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `rozvoz-${selectedDate}.csv`
      link.click()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa exportovať')
    }
  }

  useEffect(() => {
    loadRoute(selectedDate)
  }, [selectedDate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Rozvozová trasa
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            {route && (
              <button
                onClick={exportRoute}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {!route ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">Pre tento dátum ešte nie je vytvorená rozvozová trasa.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input
                type="text"
                placeholder="Meno vodiča"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Telefón vodiča"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Vozidlo"
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={createRoute}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 mx-auto"
            >
              <Play className="w-4 h-4" />
              Vytvoriť trasu
            </button>
          </div>
        ) : (
          <>
            {/* Route Info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Vodič</label>
                  <p className="font-medium">{route.driverName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Telefón</label>
                  <p className="font-medium">{route.driverPhone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Vozidlo</label>
                  <p className="font-medium">{route.vehicleInfo || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Stav trasy</label>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${STATUS_COLORS[route.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[route.status] || route.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Por.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zákazník</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jedlo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Množ.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stav</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akcie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{item.deliverySequence}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{item.userName}</div>
                        <div className="text-xs text-gray-500">{item.userPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {item.deliveryAddress}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.menuItemName}</td>
                      <td className="px-4 py-3 text-sm">{item.quantity}</td>
                      <td className="px-4 py-3">
                        <select
                          value={item.deliveryStatus}
                          onChange={(e) => updateItemStatus(item.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border-0 ${STATUS_COLORS[item.deliveryStatus] || 'bg-gray-100'}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => markDelivered(item.id)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Označiť ako doručené"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => markFailed(item.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Označiť ako nedoručené"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
