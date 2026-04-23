import { useEffect, useState } from 'react'
import { adminApi, customerServiceApi, menuApi } from '../../services/api'
import { Search, Users, UserCheck, UserX, Eye, Plus, Save, X, Trash2, Lock, Unlock, Edit2 } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import type { User, DailyMenu } from '../../types'

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
  
  // Customer service modal
  const [selectedUser, setSelectedUser] = useState<CustomerDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editQuantity, setEditQuantity] = useState<{[key: string]: number}>({})
  
  // Add order modal
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false)
  const [availableMenu, setAvailableMenu] = useState<DailyMenu[]>([])
  const [selectedMenuItem, setSelectedMenuItem] = useState('')
  const [orderQuantity, setOrderQuantity] = useState(1)

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

  const handleViewDetail = async (userId: string) => {
    try {
      const response = await customerServiceApi.getUserDetail(userId)
      setSelectedUser(response.data.data)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to load user detail:', error)
      alert('Nepodarilo sa načítať detail zákazníka')
    }
  }

  const handleUpdatePlan = async (planId: string) => {
    const quantity = editQuantity[planId]
    if (quantity === undefined) return

    setIsSaving(true)
    try {
      await customerServiceApi.updatePlan(planId, quantity)
      // Refresh detail
      if (selectedUser) {
        const response = await customerServiceApi.getUserDetail(selectedUser.user.id)
        setSelectedUser(response.data.data)
      }
      setEditQuantity(prev => {
        const next = { ...prev }
        delete next[planId]
        return next
      })
    } catch (error: any) {
      alert('Chyba pri ukladaní: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelPlan = async (planId: string) => {
    if (!confirm('Naozaj chcete zrušiť túto objednávku?')) return

    setIsSaving(true)
    try {
      await customerServiceApi.cancelPlan(planId)
      // Refresh detail
      if (selectedUser) {
        const response = await customerServiceApi.getUserDetail(selectedUser.user.id)
        setSelectedUser(response.data.data)
      }
    } catch (error: any) {
      alert('Chyba pri rušení: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddOrder = async () => {
    if (!selectedUser || !selectedMenuItem || orderQuantity < 1) {
      alert('Vyberte jedlo a množstvo')
      return
    }

    setIsSaving(true)
    try {
      await customerServiceApi.createOrder(selectedUser.user.id, selectedMenuItem, orderQuantity)
      // Refresh detail
      const response = await customerServiceApi.getUserDetail(selectedUser.user.id)
      setSelectedUser(response.data.data)
      setIsAddOrderOpen(false)
      setSelectedMenuItem('')
      setOrderQuantity(1)
    } catch (error: any) {
      alert('Chyba pri vytváraní objednávky: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSaving(false)
    }
  }

  const openAddOrder = async () => {
    try {
      // Get available menu items for next 14 days
      const response = await menuApi.getDailyMenu()
      const now = new Date()
      const available = (response.data.data || []).filter((item: DailyMenu) => {
        const deadline = item.deadlineTimestamp ? new Date(item.deadlineTimestamp) : null
        return deadline && deadline > now
      })
      setAvailableMenu(available)
      setIsAddOrderOpen(true)
    } catch (error) {
      console.error('Failed to load menu:', error)
      alert('Nepodarilo sa načítať menu')
    }
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

      {/* Customer Detail Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedUser.user.first_name} {selectedUser.user.last_name}
                  </h2>
                  <p className="text-gray-600">{selectedUser.user.email}</p>
                  <p className="text-gray-600">{selectedUser.user.phone}</p>
                  <p className="text-gray-600">{selectedUser.user.address}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Current Orders */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Aktuálne objednávky</h3>
                  <button
                    onClick={openAddOrder}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Pridať objednávku
                  </button>
                </div>
                
                {selectedUser.currentPlans.length === 0 ? (
                  <p className="text-gray-500">Žiadne aktuálne objednávky</p>
                ) : (
                  <div className="space-y-3">
                    {selectedUser.currentPlans.map((plan) => (
                      <div key={plan.planId} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{plan.menuItem.name}</p>
                            <p className="text-sm text-gray-600">
                              {plan.date} | {plan.menuSlot} | {plan.menuItem.price.toFixed(2)} €
                            </p>
                            {plan.isEditable ? (
                              <span className="text-xs text-green-600 flex items-center mt-1">
                                <Unlock className="w-3 h-3 mr-1" />
                                Upraviteľné
                              </span>
                            ) : (
                              <span className="text-xs text-red-600 flex items-center mt-1">
                                <Lock className="w-3 h-3 mr-1" />
                                Uzamknuté
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {editQuantity[plan.planId] !== undefined ? (
                              <>
                                <input
                                  type="number"
                                  min="0"
                                  value={editQuantity[plan.planId]}
                                  onChange={(e) => setEditQuantity(prev => ({
                                    ...prev,
                                    [plan.planId]: parseInt(e.target.value) || 0
                                  }))}
                                  className="input w-20 text-center"
                                />
                                <button
                                  onClick={() => handleUpdatePlan(plan.planId)}
                                  disabled={isSaving}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditQuantity(prev => {
                                    const next = { ...prev }
                                    delete next[plan.planId]
                                    return next
                                  })}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">{plan.quantity} ks</span>
                                {plan.isEditable && (
                                  <>
                                    <button
                                      onClick={() => setEditQuantity(prev => ({
                                        ...prev,
                                        [plan.planId]: plan.quantity
                                      }))}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Upraviť množstvo"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleCancelPlan(plan.planId)}
                                      disabled={isSaving}
                                      className="text-red-600 hover:text-red-800"
                                      title="Zrušiť objednávku"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">História objednávok</h3>
                {selectedUser.history.length === 0 ? (
                  <p className="text-gray-500">Žiadna história</p>
                ) : (
                  <div className="space-y-3">
                    {selectedUser.history.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <p className="font-medium">{item.date}</p>
                        <p className="text-sm text-gray-600">
                          {item.items.map(i => `${i.itemName} (${i.quantity}ks)`).join(', ')}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          Celkom: {item.totalPrice.toFixed(2)} €
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {isAddOrderOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Pridať objednávku</h2>
                <button 
                  onClick={() => setIsAddOrderOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="label">Jedlo</label>
                  <select
                    value={selectedMenuItem}
                    onChange={(e) => setSelectedMenuItem(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Vyberte jedlo...</option>
                    {availableMenu.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.date} - {item.menuSlot} - {item.menuItem?.name || item.menuItemId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Množstvo</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                    className="input w-full"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsAddOrderOpen(false)}
                    className="btn-secondary flex-1"
                  >
                    Zrušiť
                  </button>
                  <button
                    onClick={handleAddOrder}
                    disabled={isSaving || !selectedMenuItem}
                    className="btn-primary flex-1"
                  >
                    {isSaving ? 'Ukladám...' : 'Pridať objednávku'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
