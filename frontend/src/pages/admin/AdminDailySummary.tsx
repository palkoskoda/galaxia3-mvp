import { useState, useEffect } from 'react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function AdminDailySummary() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = async (date: string = selectedDate) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await adminApi.getDailySummary(date)
      console.log('Daily summary:', response.data)
      setSummary(response.data.data || null)
    } catch (err: any) {
      console.error('Failed to load summary:', err)
      setError(err.message || 'Nepodarilo sa načítať súpisku')
    } finally {
      setIsLoading(false)
    }
  }

  // Automaticky načítať pri načítaní stránky a pri zmene dátumu
  useEffect(() => {
    loadSummary(selectedDate)
  }, [selectedDate])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-600">Chyba</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button onClick={() => loadSummary(selectedDate)} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded">
            Skúsiť znova
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Denná súpiska</h1>
        
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium">Dátum:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
            {isLoading && <LoadingSpinner size="sm" />}
          </div>
        </div>

        {isLoading && (
          <div className="mt-6 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {summary && !isLoading && (
          <div className="mt-6 space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold">Súhrn pre {summary.date}</h2>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-600">Jedál celkom</p>
                  <p className="text-2xl font-bold">{summary.totals?.total_meals || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Zákazníkov</p>
                  <p className="text-2xl font-bold">{summary.totals?.total_customers || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tržba</p>
                  <p className="text-2xl font-bold">{summary.totals?.total_revenue?.toFixed(2) || '0.00'} €</p>
                </div>
              </div>
            </div>

            {summary.kitchen && summary.kitchen.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Pre kuchyňu</h3>
                <ul className="space-y-2">
                  {summary.kitchen.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.menu_item_name}</span>
                      <span className="font-bold">{item.total_quantity} ks</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.deliveries && summary.deliveries.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Rozvoz podľa adresy</h3>
                <div className="space-y-4">
                  {summary.deliveries.map((delivery: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{delivery.userName}</p>
                          <p className="text-sm text-gray-600">{delivery.userAddress || 'Bez adresy'}</p>
                          <p className="text-sm text-gray-500">{delivery.userPhone || ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary-600">{Number(delivery.totalPrice || 0).toFixed(2)} €</p>
                        </div>
                      </div>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {delivery.items?.map((item: any, itemIdx: number) => (
                          <li key={itemIdx} className="flex justify-between gap-4">
                            <span>{item.itemName}</span>
                            <span>{item.quantity} ks</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!summary && !isLoading && !error && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-500">Pre vybraný dátum nie sú žiadne objednávky</p>
          </div>
        )}
      </div>
    </div>
  )
}
