import { useEffect, useState } from 'react'
import { menuApi, adminApi } from '../../services/api'
import { Plus, Edit2, Trash2, Calendar, BookOpen, X } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import type { MenuItem, DailyMenu } from '../../types'

export default function AdminMenu() {
  const [activeTab, setActiveTab] = useState<'library' | 'daily'>('library')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [dailyMenu, setDailyMenu] = useState<DailyMenu[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'library') {
        const response = await menuApi.getItems()
        setMenuItems(response.data.data || [])
      } else {
        const response = await menuApi.getDailyMenu()
        setDailyMenu(response.data.data || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Nepodarilo sa načítať dáta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Správa menu</h1>
          <p className="text-gray-600 mt-2">
            Knižnica jedál a denná ponuka.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'library'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Knižnica jedál
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'daily'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Denná ponuka
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : activeTab === 'library' ? (
          <MenuLibrary items={menuItems} onRefresh={loadData} />
        ) : (
          <DailyMenuView items={dailyMenu} allMenuItems={menuItems} onRefresh={loadData} />
        )}
      </div>
    </div>
  )
}

// ==================== MENU LIBRARY ====================

function MenuLibrary({ items, onRefresh }: { items: MenuItem[]; onRefresh: () => void }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Naozaj chcete vymazať toto jedlo?')) return
    
    try {
      await menuApi.deleteItem(id)
      toast.success('Jedlo bolo vymazané')
      onRefresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nepodarilo sa vymazať jedlo')
    }
  }

  return (
    <div className="card">
      <div className="card-header border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Knižnica jedál ({items.length})</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary btn-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Pridať jedlo
        </button>
      </div>
      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Názov</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Popis</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Cena</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Alergény</th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">Typ</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 text-gray-900 font-medium">{item.name}</td>
                  <td className="py-3 text-gray-600 max-w-xs truncate">{item.description}</td>
                  <td className="py-3 text-right text-gray-900">{item.price.toFixed(2)} €</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.allergens.map((a) => (
                        <span key={a} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`badge ${item.deadlineType === 'standard' ? 'badge-blue' : 'badge-yellow'}`}>
                      {item.deadlineType === 'standard' ? 'Štandard' : 'Expres'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button 
                      onClick={() => { setEditingItem(item); setShowEditModal(true) }}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddMenuItemModal onClose={() => setShowAddModal(false)} onSuccess={onRefresh} />
      )}
      {showEditModal && editingItem && (
        <EditMenuItemModal item={editingItem} onClose={() => setShowEditModal(false)} onSuccess={onRefresh} />
      )}
    </div>
  )
}

// ==================== DAILY MENU ====================

function DailyMenuView({ items, allMenuItems, onRefresh }: { 
  items: DailyMenu[]; 
  allMenuItems: MenuItem[];
  onRefresh: () => void 
}) {
  const [showAddModal, setShowAddModal] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('Naozaj chcete odstrániť túto položku z ponuky?')) return
    
    try {
      await menuApi.deleteDailyMenu(id)
      toast.success('Položka bola odstránená z ponuky')
      onRefresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nepodarilo sa odstrániť položku')
    }
  }

  return (
    <div className="card">
      <div className="card-header border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Denná ponuka ({items.length})</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary btn-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Pridať do ponuky
        </button>
      </div>
      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Dátum</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Slot</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Jedlo</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Uzávierka</th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">Max množ.</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 text-gray-900">{item.date}</td>
                  <td className="py-3">
                    <span className={`badge ${
                      item.menuSlot === 'MenuA' ? 'badge-blue' :
                      item.menuSlot === 'MenuB' ? 'badge-green' :
                      item.menuSlot === 'Soup' ? 'badge-yellow' : 'badge-purple'
                    }`}>
                      {item.menuSlot}
                    </span>
                  </td>
                  <td className="py-3 text-gray-900">{item.menuItem?.name || '?'}</td>
                  <td className="py-3 text-gray-600">
                    {new Date(item.deadlineTimestamp).toLocaleString('sk-SK', {
                      day: 'numeric',
                      month: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 text-center">{item.maxQuantity || '-'}</td>
                  <td className="py-3 text-right">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddDailyMenuModal 
          menuItems={allMenuItems} 
          onClose={() => setShowAddModal(false)} 
          onSuccess={onRefresh} 
        />
      )}
    </div>
  )
}

// ==================== MODALS ====================

function AddMenuItemModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    allergens: '',
    deadlineType: 'standard',
    category: 'main'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await menuApi.createItem({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        allergens: formData.allergens.split(',').map(a => a.trim()).filter(Boolean),
        deadlineType: formData.deadlineType as 'standard' | 'express',
        category: formData.category
      })
      toast.success('Jedlo bolo pridané')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nepodarilo sa pridať jedlo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Pridať nové jedlo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Názov *</label>
          <input 
            type="text" 
            className="input"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="label">Popis</label>
          <textarea 
            className="input"
            rows={2}
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Cena (€) *</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              className="input"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="label">Typ uzávierky</label>
            <select 
              className="input"
              value={formData.deadlineType}
              onChange={e => setFormData({...formData, deadlineType: e.target.value})}
            >
              <option value="standard">Štandard (deň pred)</option>
              <option value="express">Expres (ráno)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Alergény (oddelené čiarkou)</label>
          <input 
            type="text" 
            className="input"
            placeholder="napr. 1, 3, 7 (lepk, vajc, mlieko)"
            value={formData.allergens}
            onChange={e => setFormData({...formData, allergens: e.target.value})}
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Zrušiť
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Ukladám...' : 'Pridať jedlo'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditMenuItemModal({ item, onClose, onSuccess }: { item: MenuItem; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description || '',
    price: item.price.toString(),
    allergens: item.allergens.join(', '),
    deadlineType: item.deadlineType,
    category: item.category || 'main'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await menuApi.updateItem(item.id, {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        allergens: formData.allergens.split(',').map(a => a.trim()).filter(Boolean),
        deadlineType: formData.deadlineType as 'standard' | 'express',
        category: formData.category
      })
      toast.success('Jedlo bolo upravené')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nepodarilo sa upraviť jedlo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Upraviť jedlo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Názov *</label>
          <input 
            type="text" 
            className="input"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="label">Popis</label>
          <textarea 
            className="input"
            rows={2}
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Cena (€) *</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              className="input"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="label">Typ uzávierky</label>
            <select 
              className="input"
              value={formData.deadlineType}
              onChange={e => setFormData({...formData, deadlineType: e.target.value})}
            >
              <option value="standard">Štandard (deň pred)</option>
              <option value="express">Expres (ráno)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Alergény (oddelené čiarkou)</label>
          <input 
            type="text" 
            className="input"
            placeholder="napr. 1, 3, 7"
            value={formData.allergens}
            onChange={e => setFormData({...formData, allergens: e.target.value})}
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Zrušiť
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Ukladám...' : 'Uložiť zmeny'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AddDailyMenuModal({ menuItems, onClose, onSuccess }: { 
  menuItems: MenuItem[]; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const [formData, setFormData] = useState({
    date: tomorrow.toISOString().split('T')[0],
    menuItemId: '',
    menuSlot: 'MenuA',
    maxQuantity: '50',
    deadlineDate: tomorrow.toISOString().split('T')[0],
    deadlineTime: '14:30'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Vytvoríme deadlineTimestamp z vybraného dátumu a času
      const deadlineTimestamp = `${formData.deadlineDate}T${formData.deadlineTime}:00`
      
      await menuApi.createDailyMenu({
        date: formData.date,
        menuItemId: formData.menuItemId,
        menuSlot: formData.menuSlot as 'MenuA' | 'MenuB' | 'Soup' | 'Special',
        maxQuantity: parseInt(formData.maxQuantity),
        deadlineTimestamp
      })
      toast.success('Položka bola pridaná do ponuky')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nepodarilo sa pridať do ponuky')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Pridať do dennej ponuky" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Dátum *</label>
            <input 
              type="date" 
              className="input"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="label">Slot *</label>
            <select 
              className="input"
              value={formData.menuSlot}
              onChange={e => setFormData({...formData, menuSlot: e.target.value})}
            >
              <option value="MenuA">Menu A</option>
              <option value="MenuB">Menu B</option>
              <option value="Soup">Polievka</option>
              <option value="Special">Špecialita</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Jedlo *</label>
          <select 
            className="input"
            value={formData.menuItemId}
            onChange={e => setFormData({...formData, menuItemId: e.target.value})}
            required
          >
            <option value="">Vyberte jedlo...</option>
            {menuItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.price.toFixed(2)} €)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Max množstvo</label>
          <input 
            type="number" 
            min="1"
            className="input"
            value={formData.maxQuantity}
            onChange={e => setFormData({...formData, maxQuantity: e.target.value})}
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <label className="label text-primary-700 font-semibold">Uzávierka objednávok</label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-sm text-gray-600">Dátum uzávierky</label>
              <input 
                type="date" 
                className="input"
                value={formData.deadlineDate}
                onChange={e => setFormData({...formData, deadlineDate: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Čas uzávierky</label>
              <input 
                type="time" 
                className="input"
                value={formData.deadlineTime}
                onChange={e => setFormData({...formData, deadlineTime: e.target.value})}
                required
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Napr. pre obed 20.4. do 14:30 predchádzajúceho dňa: dátum 19.4., čas 14:30
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Zrušiť
          </button>
          <button type="submit" disabled={isSubmitting || !formData.menuItemId} className="btn-primary">
            {isSubmitting ? 'Pridávam...' : 'Pridať do ponuky'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ==================== SHARED COMPONENTS ====================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
