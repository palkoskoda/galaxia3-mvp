import { useEffect, useState } from 'react'
import { historyApi } from '../services/api'
import { formatDateWithDay } from '../utils/date'
import { History, Package, CheckCircle, Clock, XCircle, Truck } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import type { OrderHistory } from '../types'

export default function HistoryPage() {
  const [history, setHistory] = useState<OrderHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const response = await historyApi.getMyHistory()
      setHistory(response.data.data || [])
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'out_for_delivery':
        return <Truck className="w-5 h-5 text-blue-600" />
      case 'preparing':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Čaká sa'
      case 'preparing': return 'Pripravuje sa'
      case 'out_for_delivery': return 'Na ceste'
      case 'delivered': return 'Doručené'
      case 'cancelled': return 'Zrušené'
      default: return status
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge-green">Zaplatené</span>
      case 'invoiced':
        return <span className="badge-blue">Fakturované</span>
      case 'overdue':
        return <span className="badge-red">Po splatnosti</span>
      default:
        return <span className="badge-gray">Čaká sa</span>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">História dodávok</h1>
          <p className="text-gray-600 mt-2">
            Prehľad doručených objednávok a ich stav.
          </p>
        </div>

        <div className="space-y-4">
          {history.map((order) => (
            <div key={order.id} className="card">
              <div className="card-header border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center">
                    {getStatusIcon(order.deliveryStatus)}
                    <div className="ml-3">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {formatDateWithDay(order.date)}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {getStatusText(order.deliveryStatus)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getPaymentStatusBadge(order.paymentStatus)}
                    <span className="text-lg font-bold text-gray-900">
                      {order.totalPrice.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{item.itemName}</span>
                        <span className="text-gray-500 ml-2">× {item.quantity}</span>
                      </div>
                      <span className="text-gray-600">{item.total.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
                {order.notes && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Poznámka:</strong> {order.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {history.length === 0 && (
            <div className="card p-8 text-center">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Zatiaľ nemáte žiadnu históriu
              </h3>
              <p className="text-gray-500">
                Tu sa zobrazia vaše dokončené dodávky.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
