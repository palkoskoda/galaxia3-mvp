import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlanStore } from '../stores/planStore'
import { useAuthStore } from '../stores/authStore'
import { formatDateShort, formatDateWithDay, isToday, isTomorrow, getDeadlineText, isDeadlinePassed } from '../utils/date'
import { Minus, Plus, Info, AlertCircle, Clock, ChevronDown, Phone, Mail, LogIn } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import type { DailyMenuWithSelection } from '../types'

export default function MenuPage() {
  const { menuPlan, isLoading, isUpdating, fetchMenuPlan, setSelection } = usePlanStore()
  const { user, isAuthenticated } = useAuthStore()
  const isSenior = user?.isSenior ?? false
  const [selectedDate, setSelectedDate] = useState<string>('')

  useEffect(() => {
    fetchMenuPlan()
  }, [fetchMenuPlan])

  // Set initial selected date when menuPlan loads
  useEffect(() => {
    if (menuPlan && !selectedDate) {
      const dates = Object.keys(menuPlan).sort()
      if (dates.length > 0) {
        setSelectedDate(dates[0])
      }
    }
  }, [menuPlan, selectedDate])

  const handleQuantityChange = async (dailyMenuId: string, currentQuantity: number, delta: number, itemName: string) => {
    if (!isAuthenticated) return
    const newQuantity = Math.max(0, currentQuantity + delta)

    // Show confirmation when removing item (going from 1 to 0)
    if (currentQuantity === 1 && delta === -1) {
      if (!confirm(`Odstrániť "${itemName}" z plánu?`)) {
        return
      }
    }

    try {
      await setSelection(dailyMenuId, newQuantity)
    } catch (error) {
      console.error('Failed to update selection:', error)
    }
  }

  const getDateLabel = (date: string) => {
    if (isToday(date)) return 'Dnes'
    if (isTomorrow(date)) return 'Zajtra'
    return formatDateWithDay(date)
  }

  const getSlotLabel = (slot: string) => {
    switch (slot) {
      case 'MenuA': return 'Menu A'
      case 'MenuB': return 'Menu B'
      case 'Soup': return 'Polievka'
      case 'Special': return 'Špeciál'
      case 'Extra': return 'Extra'
      default: return slot
    }
  }

  const getSlotColor = (slot: string) => {
    switch (slot) {
      case 'MenuA': return 'bg-blue-100 text-blue-800'
      case 'MenuB': return 'bg-green-100 text-green-800'
      case 'Soup': return 'bg-yellow-100 text-yellow-800'
      case 'Special': return 'bg-purple-100 text-purple-800'
      case 'Extra': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const dates = menuPlan ? Object.keys(menuPlan).sort() : []

  if (dates.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Jedálny lístok</h1>
          </div>
          <div className="card p-8 text-center">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Momentálne nie je k dispozícii žiadne menu.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Jedálny lístok</h1>
          {isAuthenticated ? (
            <p className="text-gray-600 mt-2">
              Kliknutím na +/- upravte počty jedál pre jednotlivé dni.
            </p>
          ) : (
            <p className="text-gray-600 mt-2">
              Pre objednanie sa prihláste alebo zavolajte.
            </p>
          )}
        </div>

        {/* Public contact banner */}
        {!isAuthenticated && (
          <div className="mb-6 bg-primary-50 border border-primary-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Objednávky telefonicky</p>
                  <p className="text-sm text-gray-600">Banská Štiavnica, Dudince, Dobrá Niva: <a href="tel:+421948953871" className="text-primary-600 font-semibold hover:underline">0948 953 871</a></p>
                  <p className="text-sm text-gray-600">Zvolen: <a href="tel:+421949001656" className="text-primary-600 font-semibold hover:underline">0949 001 656</a></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <a href="mailto:galaxia.obedy@gmail.com" className="text-sm text-primary-600 font-semibold hover:underline">galaxia.obedy@gmail.com</a>
                </div>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex-shrink-0"
              >
                <LogIn className="w-4 h-4" />
                Prihlásiť sa pre objednanie
              </Link>
            </div>
          </div>
        )}

        {/* Date selector for mobile */}
        <div className="md:hidden mb-6">
          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input appearance-none pr-10"
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {getDateLabel(date)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Desktop: All days */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dates.map((date) => (
            <DayCard
              key={date}
              date={date}
              dayData={menuPlan![date]}
              onQuantityChange={handleQuantityChange}
              isUpdating={isUpdating}
              getDateLabel={getDateLabel}
              getSlotLabel={getSlotLabel}
              getSlotColor={getSlotColor}
              isSenior={isSenior}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>

        {/* Mobile: Selected day */}
        <div className="md:hidden">
          {selectedDate && menuPlan && menuPlan[selectedDate] && (
            <DayCard
              date={selectedDate}
              dayData={menuPlan[selectedDate]}
              onQuantityChange={handleQuantityChange}
              isUpdating={isUpdating}
              getDateLabel={getDateLabel}
              getSlotLabel={getSlotLabel}
              getSlotColor={getSlotColor}
              isSenior={isSenior}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Day Card Component
interface DayCardProps {
  date: string
  dayData: {
    date: string
    items: DailyMenuWithSelection[]
    isPastDeadline: boolean
  }
  onQuantityChange: (dailyMenuId: string, currentQuantity: number, delta: number, itemName: string) => void
  isUpdating: boolean
  getDateLabel: (date: string) => string
  getSlotLabel: (slot: string) => string
  getSlotColor: (slot: string) => string
  isSenior: boolean
  isAuthenticated: boolean
}

function DayCard({ date, dayData, onQuantityChange, isUpdating, getDateLabel, getSlotLabel, getSlotColor, isSenior, isAuthenticated }: DayCardProps) {
  const totalForDay = dayData.items.reduce((sum, item) => {
    const price = (isSenior && item.menuItem.seniorPrice != null) ? item.menuItem.seniorPrice : item.menuItem.price
    return sum + (item.userQuantity * price)
  }, 0)
  const hasItems = dayData.items.some(item => item.userQuantity > 0)

  return (
    <div className={`card ${hasItems && isAuthenticated ? 'ring-2 ring-primary-500' : ''}`}>
      <div className="card-header border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {getDateLabel(date)}
          </h2>
          {hasItems && isAuthenticated && (
            <span className="badge-green">
              {dayData.items.reduce((sum, item) => sum + item.userQuantity, 0)} ks
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {formatDateShort(date)}
        </p>
      </div>

      <div className="card-body space-y-4">
        {dayData.items.map((item) => (
          <MenuItemRow
            key={item.id}
            item={item}
            onQuantityChange={onQuantityChange}
            isUpdating={isUpdating}
            getSlotLabel={getSlotLabel}
            getSlotColor={getSlotColor}
            isSenior={isSenior}
            isAuthenticated={isAuthenticated}
          />
        ))}

        {dayData.items.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            Pre tento deň nie je k dispozícii žiadne menu.
          </p>
        )}
      </div>

      {isAuthenticated && totalForDay > 0 && (
        <div className="card-header border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Celkom za deň:</span>
            <span className="text-lg font-bold text-primary-600">
              {totalForDay.toFixed(2)} €
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Menu Item Row Component
interface MenuItemRowProps {
  item: DailyMenuWithSelection
  onQuantityChange: (dailyMenuId: string, currentQuantity: number, delta: number, itemName: string) => void
  isUpdating: boolean
  getSlotLabel: (slot: string) => string
  getSlotColor: (slot: string) => string
  isSenior: boolean
  isAuthenticated: boolean
}

function MenuItemRow({ item, onQuantityChange, isUpdating, getSlotLabel, getSlotColor, isSenior, isAuthenticated }: MenuItemRowProps) {
  const deadlinePassed = isDeadlinePassed(item.deadlineTimestamp) || !item.isEditable
  const isAddon = item.menuSlot === 'Soup' || item.menuSlot === 'Extra'
  const displayPrice = (isSenior && item.menuItem.seniorPrice != null) ? item.menuItem.seniorPrice : item.menuItem.price

  return (
    <div className={`p-3 rounded-lg border ${item.userQuantity > 0 && !isAddon && isAuthenticated ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'} ${isAddon ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <span className={`badge ${getSlotColor(item.menuSlot)} text-xs`}>
            {getSlotLabel(item.menuSlot)}
          </span>
          <h3 className="font-medium text-gray-900 mt-1 truncate">
            {item.menuItem.name}
          </h3>
          {item.menuItem.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {item.menuItem.description}
            </p>
          )}
        </div>
        <div className="text-right ml-2">
          <span className="font-bold text-gray-900">
            {displayPrice.toFixed(2)} €
          </span>
          {isSenior && item.menuItem.seniorPrice != null && (
            <span className="block text-xs text-green-600">dôchodca</span>
          )}
        </div>
      </div>

      {/* Allergens */}
      {item.menuItem.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.menuItem.allergens.map((allergen) => (
            <span key={allergen} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {allergen}
            </span>
          ))}
        </div>
      )}

      {/* Quantity controls - only for meals, not addons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{getDeadlineText(item.deadlineTimestamp)}</span>
        </div>

        {!isAuthenticated ? (
          <span className="text-xs text-gray-400 italic">
            Pre objednanie sa prihláste
          </span>
        ) : isAddon ? (
          <span className="text-xs text-gray-500 italic">
            Automaticky k obedu
          </span>
        ) : deadlinePassed ? (
          <div className="flex items-center text-sm text-gray-500">
            <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
            {item.userQuantity > 0 ? `${item.userQuantity} ks` : 'Uzavreté'}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onQuantityChange(item.id, item.userQuantity, -1, item.menuItem.name)}
              disabled={isUpdating || item.userQuantity === 0}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium">
              {item.userQuantity}
            </span>
            <button
              onClick={() => onQuantityChange(item.id, item.userQuantity, 1, item.menuItem.name)}
              disabled={isUpdating}
              className="w-8 h-8 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-700 flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Subtotal */}
      {isAuthenticated && !isAddon && item.userQuantity > 0 && (
        <div className="mt-2 pt-2 border-t border-primary-200 text-right">
          <span className="text-sm text-primary-700 font-medium">
            {(item.userQuantity * displayPrice).toFixed(2)} €
          </span>
        </div>
      )}
    </div>
  )
}
