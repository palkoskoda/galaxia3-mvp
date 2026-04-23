import { useEffect, useState } from 'react'
import { adminApi, customerServiceApi } from '../../services/api'
import { Search, Users, UserCheck, UserX, Edit2, Eye, Lock, ShoppingCart } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import type { User } from '../../types'

interface CustomerDetail {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    address: string
    role: string
    is_active: number
    isActive: boolean
  }
  currentPlans: Array<{
    planId: string
    quantity: number
    date: string
    menuSlot: string
    menuItem: { name: string; price: number }
    isEditable: boolean
  }>
  history: Array<{
    date: string
    items: Array<{ itemName: string; quantity: number; price: number }>
    totalPrice: number
  }>
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<CustomerDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editQuantity, setEditQuantity] = useState<Record<string, number>>({})

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await adminApi.getUsers({
        role: roleFilter || undefined,
        search: searchTerm || undefined,
      })
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadUsers()
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge-red">Admin</span>
      case 'staff':
        return <span className="badge-blue">Personál</span>
      default:
        return <span className="badge-green">Zákazník</span>
    }
  }

  const handleViewDetail = async (userId: string) => {
    setIsDetailLoading(true)
    setShowDetailModal(true)
    try {
      const response = await customerServiceApi.getUserDetail(userId)
      setSelectedUser(response.data.data)
    } catch (error) {
      console.error('Failed to load user detail:', error)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleUpdatePlan = async (planId: string, quantity: number) => {
    try {
      await customerServiceApi.updatePlan(planId, quantity)
      // Refresh detail
      if (selectedUser) {
        handleViewDetail(selectedUser.user.id)
      }
    } catch (error) {
      console.error('Failed to update plan:', error)
      alert('Nepodarilo sa upraviť objednávku')
    }
  }

  const handleCancelPlan = async (planId: string) => {
    if (!confirm('Naozaj chcete zrušiť túto objednávku?')) return
    try {
      await customerServiceApi.cancelPlan(planId)
      // Refresh detail
      if (selectedUser) {
        handleViewDetail(selectedUser.user.id)
      }
    } catch (error) {
      console.error('Failed to cancel plan:', error)
      alert('Nepodarilo sa zrušiť objednávku')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Správa používateľov</h1>
          <p className="text-gray-600 mt-2">
            Zoznam a správa používateľov systému.
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Hľadať podľa mena alebo emailu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Hľadať
                </button>
              </form>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input w-full sm:w-48"
              >
                <option value="">Všetky role</option>
                <option value="customer">Zákazníci</option>
                <option value="staff">Personál</option>
                <option value="admin">Administrátori</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="card">
          <div className="card-header border-b border-gray-200">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Používatelia ({users.length})
              </h2>
            </div>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Meno</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Email</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Telefón</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">Adresa</th>
                      <th className="text-center py-3 text-sm font-medium text-gray-500">Rola</th>
                      <th className="text-center py-3 text-sm font-medium text-gray-500">Stav</th>
                      <th className="text-right py-3 text-sm font-medium text-gray-500">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3">
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="py-3 text-gray-600">{user.email}</td>
                        <td className="py-3 text-gray-600">{user.phone || '-'}</td>
                        <td className="py-3 text-gray-600 max-w-xs truncate">{user.address || '-'}</td>
                        <td className="py-3 text-center">{getRoleBadge(user.role)}</td>
                        <td className="py-3 text-center">
                          {user.isActive ? (
                            <span className="flex items-center justify-center text-green-600">
                              <UserCheck className="w-4 h-4 mr-1" />
                              Aktívny
                            </span>
                          ) : (
                            <span className="flex items-center justify-center text-red-600">
                              <UserX className="w-4 h-4 mr-1" />
                              Neaktívny
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => handleViewDetail(user.id)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                            title="Zobraziť detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Žiadni používatelia neboli nájdení
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {isDetailLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : selectedUser ? (
              <div>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedUser.user.first_name} {selectedUser.user.last_name}
                    </h2>
                    <p className="text-gray-600">{selectedUser.user.email}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6">
                  {/* User Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-sm text-gray-500">Telefón</label>
                      <p className="font-medium">{selectedUser.user.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Adresa</label>
                      <p className="font-medium">{selectedUser.user.address || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Rola</label>
                      <p className="font-medium">{getRoleBadge(selectedUser.user.role)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Stav</label>
                      <p className="font-medium">{selectedUser.user.isActive ? 'Aktívny' : 'Neaktívny'}</p>
                    </div>
                  </div>

                  {/* Current Orders */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Aktuálne objednávky
                    </h3>
                    {selectedUser.currentPlans.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.currentPlans.map((plan) => (
                          <div key={plan.planId} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{plan.menuItem.name}</p>
                                <p className="text-sm text-gray-600">
                                  {plan.date} | {plan.menuSlot} | {plan.menuItem.price.toFixed(2)} €
                                </p>
                                {!plan.isEditable && (
                                  <p className="text-xs text-red-600 flex items-center mt-1">
                                    <Lock className="w-3 h-3 mr-1" />
                                    Uzávierka uplynula
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {plan.isEditable ? (
                                  <>
                                    <input
                                      type="number"
                                      min="0"
                                      value={editQuantity[plan.planId] ?? plan.quantity}
                                      onChange={(e) => setEditQuantity({
                                        ...editQuantity,
                                        [plan.planId]: parseInt(e.target.value) || 0
                                      })}
                                      className="w-16 input text-center"
                                    />
                                    <button
                                      onClick={() => handleUpdatePlan(plan.planId, editQuantity[plan.planId] ?? plan.quantity)}
                                      className="btn-primary text-sm"
                                    >
                                      Uložiť
                                    </button>
                                    <button
                                      onClick={() => handleCancelPlan(plan.planId)}
                                      className="btn-danger text-sm"
                                    >
                                      Zrušiť
                                    </button>
                                  </>
                                ) : (
                                  <span className="font-medium">{plan.quantity} ks</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">Žiadne aktuálne objednávky</p>
                    )}
                  </div>

                  {/* History */}
                  {selectedUser.history.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">História objednávok</h3>
                      <div className="space-y-2">
                        {selectedUser.history.slice(0, 5).map((order, idx) => (
                          <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                            <p className="font-medium">{order.date}</p>
                            <p className="text-sm text-gray-600">
                              {order.items.map(item => `${item.itemName} (${item.quantity}ks)`).join(', ')}
                            </p>
                            <p className="text-right font-medium">{order.totalPrice.toFixed(2)} €</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Nepodarilo sa načítať detail
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
