import { useEffect, useState } from 'react'
import { usePlanStore } from '../stores/planStore'
import { formatDateShort, formatDateWithDay, isToday, isTomorrow, getDeadlineText, isDeadlinePassed } from '../utils/date'
import { Minus, Plus, Info, AlertCircle, Clock, ChevronDown } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import type { DailyMenuWithSelection } from '../types'

export default function MenuPage() {
  const { menuPlan, isLoading, isUpdating, fetchMenuPlan, setSelection } = usePlanStore()
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
      default: return slot
    }
  }

  const getSlotColor = (slot: string) => {
    switch (slot) {
      case 'MenuA': return 'bg-blue-100 text-blue-800'
      case 'MenuB': return 'bg-green-100 text-green-800'
      case 'Soup': return 'bg-yellow-100 text-yellow-800'
      case 'Special': return 'bg-purple-100 text-purple-800'
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
          <p className="text-gray-600 mt-2">
            Kliknutím na +/- upravte počty jedál pre jednotlivé dni.
          </p>
        </div>

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
}

function DayCard({ date, dayData, onQuantityChange, isUpdating, getDateLabel, getSlotLabel, getSlotColor }: DayCardProps) {
  const totalForDay = dayData.items.reduce((sum, item) => sum + (item.userQuantity * item.menuItem.price), 0)
  const hasItems = dayData.items.some(item => item.userQuantity > 0)

  return (
    <div className={`card ${hasItems ? 'ring-2 ring-primary-500' : ''}`}>
      <div className="card-header border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {getDateLabel(date)}
          </h2>
          {hasItems && (
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
          />
        ))}

        {dayData.items.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            Pre tento deň nie je k dispozícii žiadne menu.
          </p>
        )}
      </div>

      {totalForDay > 0 && (
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
}

function MenuItemRow({ item, onQuantityChange, isUpdating, getSlotLabel, getSlotColor }: MenuItemRowProps) {
  const deadlinePassed = isDeadlinePassed(item.deadlineTimestamp) || !item.isEditable

  return (
    <div className={`p-3 rounded-lg border ${item.userQuantity > 0 ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'}`}>
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
            {item.menuItem.price.toFixed(2)} €
          </span>
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

      {/* Quantity controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{getDeadlineText(item.deadlineTimestamp)}</span>
        </div>

        {deadlinePassed ? (
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
      {item.userQuantity > 0 && (
        <div className="mt-2 pt-2 border-t border-primary-200 text-right">
          <span className="text-sm text-primary-700 font-medium">
            {(item.userQuantity * item.menuItem.price).toFixed(2)} €
          </span>
        </div>
      )}
    </div>
  )
}
