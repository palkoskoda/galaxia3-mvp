import { useState, useEffect } from 'react'
import { orderLocksApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react'

const LOCK_TYPE_LABELS: Record<string, string> = {
  manual: 'Manuálne',
  deadline: 'Po uzávierke',
  payment: 'Neplatba',
  dispute: 'Spór',
}

const LOCK_TYPE_COLORS: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-800',
  deadline: 'bg-yellow-100 text-yellow-800',
  payment: 'bg-red-100 text-red-800',
  dispute: 'bg-orange-100 text-orange-800',
}

export default function AdminOrderLocks() {
  const [locks, setLocks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [selectedPlanItemId, setSelectedPlanItemId] = useState('')
  const [lockReason, setLockReason] = useState('')
  const [lockType, setLockType] = useState('manual')

  const loadLocks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await orderLocksApi.getLocks({
        active: showActiveOnly,
      })
      setLocks(response.data.data || [])
    } catch (err: any) {
      console.error('Failed to load locks:', err)
      setError(err.message || 'Nepodarilo sa načítať uzamknutia')
    } finally {
      setIsLoading(false)
    }
  }

  const createLock = async () => {
    if (!selectedPlanItemId || !lockReason) {
      setError('Plan Item ID a dôvod sú povinné')
      return
    }
    try {
      setIsLoading(true)
      await orderLocksApi.createLock({
        planItemId: selectedPlanItemId,
        lockReason,
        lockType,
      })
      setSelectedPlanItemId('')
      setLockReason('')
      await loadLocks()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nepodarilo sa uzamknúť')
    } finally {
      setIsLoading(false)
    }
  }

  const unlock = async (lockId: string) => {
    const reason = prompt('Dôvod odomknutia:')
    if (!reason) return
    try {
      setIsLoading(true)
      await orderLocksApi.unlock(lockId, reason)
      await loadLocks()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa odomknúť')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLocks()
  }, [showActiveOnly])

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
            <Lock className="w-6 h-6" />
            Uzamknutia objednávok
          </h1>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Len aktívne</span>
          </label>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Create Lock Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Nové uzamknutie</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Plan Item ID"
              value={selectedPlanItemId}
              onChange={(e) => setSelectedPlanItemId(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Dôvod uzamknutia"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={lockType}
              onChange={(e) => setLockType(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {Object.entries(LOCK_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={createLock}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Lock className="w-4 h-4" />
            Uzamknúť objednávku
          </button>
        </div>

        {/* Locks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zákazník</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dôvod</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uzamkol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dátum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stav</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akcie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locks.map((lock) => (
                <tr key={lock.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{lock.id.slice(0, 16)}...</td>
                  <td className="px-4 py-3 text-sm">{lock.userName || '-'}</td>
                  <td className="px-4 py-3 text-sm">{lock.lockReason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${LOCK_TYPE_COLORS[lock.lockType] || 'bg-gray-100'}`}>
                      {LOCK_TYPE_LABELS[lock.lockType] || lock.lockType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{lock.lockedByName || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(lock.lockedAt).toLocaleString('sk-SK')}
                  </td>
                  <td className="px-4 py-3">
                    {lock.unlockedAt ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Odomknuté
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <Lock className="w-4 h-4" />
                        Uzamknuté
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!lock.unlockedAt && (
                      <button
                        onClick={() => unlock(lock.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                      >
                        <Unlock className="w-3 h-3" />
                        Odomknúť
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {locks.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Žiadne uzamknutia na zobrazenie
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
