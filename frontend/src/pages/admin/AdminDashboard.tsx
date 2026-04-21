import { useEffect, useState } from 'react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await adminApi.getDashboard()
        console.log('Dashboard stats:', response.data)
        setStats(response.data.data || null)
      } catch (err: any) {
        console.error('Failed to load stats:', err)
        setError(err.message || 'Nepodarilo sa načítať štatistiky')
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-600">Chyba</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        
        {stats ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700">Dnešné objednávky</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {stats.today?.total_orders || 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700">Jedál dnes</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {stats.today?.total_meals || 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700">Zajtrajšie objednávky</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {stats.tomorrow?.total_orders || 0}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700">Aktívni zákazníci</h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {stats.activeCustomers || 0}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500">Žiadne dáta na zobrazenie</p>
          </div>
        )}
      </div>
    </div>
  )
}
