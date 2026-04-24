import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  MeasuringStrategy,
  CollisionDetection,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { deliveryRunsApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Truck, Plus, Download, CheckCircle, XCircle, Trash2, GripVertical, Copy } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čaká',
  delivered: 'Doručené',
  failed: 'Nedoručené',
}

// Flattened item type for DnD
type DnDItem = {
  id: string
  runId: string | null
  userName: string
  deliveryAddress: string
  quantity: number
  menuItemName: string
  deliveryStatus: string
  deliverySequence: number
  price: number
}

type Column = {
  id: string
  name: string
  driverName?: string
  driverPhone?: string
  vehicleInfo?: string
  timeFrom?: string
  timeTo?: string
  items: DnDItem[]
}

// Droppable Column Container
function DroppableColumn({
  id,
  children,
  className = '',
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'column', columnId: id },
  })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
    >
      {children}
    </div>
  )
}

// Sortable Item Component
function SortableItem({
  item,
  isSelected,
  onSelect,
  onMarkDelivered,
  onMarkFailed,
}: {
  item: DnDItem
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onMarkDelivered: () => void
  onMarkFailed: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'item', item, columnId: item.runId || 'unassigned' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-3 shadow-sm border-2 mb-2 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'
      } ${isDragging ? 'rotate-2 z-50' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">#{item.deliverySequence}</span>
            <p className="text-sm font-medium truncate">{item.userName}</p>
          </div>
          <p className="text-xs text-gray-500 truncate">{item.deliveryAddress}</p>
          <p className="text-xs text-gray-600">
            {item.quantity}x {item.menuItemName}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.deliveryStatus] || 'bg-gray-100'}`}>
              {STATUS_LABELS[item.deliveryStatus] || item.deliveryStatus}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onMarkDelivered() }}
              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
              title="Doručené"
            >
              <CheckCircle className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMarkFailed() }}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
              title="Nedoručené"
            >
              <XCircle className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDeliveryRuns() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [showNewRunForm, setShowNewRunForm] = useState(false)
  const [newRun, setNewRun] = useState({
    name: '',
    driverName: '',
    driverPhone: '',
    vehicleInfo: '',
    timeFrom: '',
    timeTo: '',
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<DnDItem | null>(null)
  const [dragStartColumnId, setDragStartColumnId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load data and flatten into columns
  const loadData = useCallback(async () => {
    console.log('loadData called for date:', selectedDate)
    try {
      setIsLoading(true)
      setError(null)
      const response = await deliveryRunsApi.getRuns(selectedDate)
      console.log('loadData response:', response.data)
      const data = response.data.data

      const newColumns: Column[] = []

      // Add run columns
      for (const run of data.runs || []) {
        newColumns.push({
          id: run.id,
          name: run.name,
          driverName: run.driverName,
          driverPhone: run.driverPhone,
          vehicleInfo: run.vehicleInfo,
          timeFrom: run.timeFrom,
          timeTo: run.timeTo,
          items: (run.items || []).map((item: any) => ({
            id: item.planItemId || item.id,
            runId: run.id,
            userName: item.userName,
            deliveryAddress: item.deliveryAddress,
            quantity: item.quantity,
            menuItemName: item.menuItemName,
            deliveryStatus: item.deliveryStatus,
            deliverySequence: item.deliverySequence,
            price: item.menuItemPrice || item.price || 0,
          })),
        })
      }

      // Add unassigned column
      newColumns.push({
        id: 'unassigned',
        name: 'Nepriradené',
        items: (data.unassigned?.items || []).map((item: any) => ({
          id: item.planItemId || item.id,
          runId: null,
          userName: item.userName,
          deliveryAddress: item.deliveryAddress,
          quantity: item.quantity,
          menuItemName: item.menuItemName,
          deliveryStatus: item.deliveryStatus || 'pending',
          deliverySequence: item.deliverySequence || 0,
          price: item.menuItemPrice || item.price || 0,
        })),
      })

      setColumns(newColumns)
      setSelectedItems(new Set())
      setLastSelectedId(null)
    } catch (err: any) {
      console.error('Failed to load runs:', err)
      setError(err.message || 'Nepodarilo sa načítať jazdy')
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  const createRun = async () => {
    if (!newRun.name) return
    try {
      setIsLoading(true)
      await deliveryRunsApi.createRun({
        date: selectedDate,
        ...newRun,
      })
      setNewRun({ name: '', driverName: '', driverPhone: '', vehicleInfo: '', timeFrom: '', timeTo: '' })
      setShowNewRunForm(false)
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nepodarilo sa vytvoriť jazdu')
    } finally {
      setIsLoading(false)
    }
  }

  const autoAssign = async () => {
    try {
      setIsLoading(true)
      await deliveryRunsApi.autoAssign(selectedDate)
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nepodarilo sa auto-priradiť')
    } finally {
      setIsLoading(false)
    }
  }

  const bootstrapRuns = async () => {
    try {
      setIsLoading(true)
      const response = await deliveryRunsApi.bootstrapRuns(selectedDate)
      await loadData()
      const source = response.data.data.source
      if (source === 'last-used-day') {
        setError(null)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nepodarilo sa preniesť jazdy z posledného dňa')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteRun = async (runId: string) => {
    if (!confirm('Naozaj zmazať túto jazdu? Objednávky budú nepriradené.')) return
    try {
      setIsLoading(true)
      await deliveryRunsApi.deleteRun(runId)
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nepodarilo sa zmazať')
    } finally {
      setIsLoading(false)
    }
  }

  const markDelivered = async (itemId: string) => {
    try {
      await deliveryRunsApi.markDelivered(itemId)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa označiť')
    }
  }

  const markFailed = async (itemId: string) => {
    const reason = prompt('Dôvod nedoručenia:')
    if (!reason) return
    try {
      await deliveryRunsApi.markFailed(itemId, reason)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa označiť')
    }
  }

  const toggleItemSelection = (itemId: string, e: React.MouseEvent) => {
    const newSelected = new Set(selectedItems)

    if (e.shiftKey && lastSelectedId) {
      const allItemIds = columns.flatMap((col) => col.items.map((i) => i.id))
      const lastIdx = allItemIds.indexOf(lastSelectedId)
      const currentIdx = allItemIds.indexOf(itemId)

      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx)
        const end = Math.max(lastIdx, currentIdx)
        for (let i = start; i <= end; i++) {
          newSelected.add(allItemIds[i])
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId)
      } else {
        newSelected.add(itemId)
        setLastSelectedId(itemId)
      }
    } else {
      if (newSelected.has(itemId) && newSelected.size === 1) {
        newSelected.clear()
        setLastSelectedId(null)
      } else {
        newSelected.clear()
        newSelected.add(itemId)
        setLastSelectedId(itemId)
      }
    }

    setSelectedItems(newSelected)
  }

  const moveSelectedToRun = async (targetRunId: string) => {
    if (selectedItems.size === 0) return
    try {
      setIsLoading(true)
      const targetId = targetRunId === 'unassigned' ? null : targetRunId
      await deliveryRunsApi.moveItems(Array.from(selectedItems), targetId)
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nepodarilo sa presunúť')
    } finally {
      setIsLoading(false)
    }
  }

  const exportRuns = async () => {
    try {
      const response = await deliveryRunsApi.exportRuns(selectedDate)
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `rozvoz-${selectedDate}.csv`
      link.click()
    } catch (err: any) {
      setError(err.message || 'Nepodarilo sa exportovať')
    }
  }

  // Find which column contains an item
  const findColumn = (itemId: string): string | null => {
    for (const col of columns) {
      if (col.items.some((i) => i.id === itemId)) return col.id
    }
    return null
  }

  // Get column by ID
  const getColumn = (columnId: string): Column | undefined => {
    return columns.find((col) => col.id === columnId)
  }

  // Calculate totals for a column
  const getColumnTotals = (column: Column) => {
    return column.items.reduce(
      (acc, item) => ({
        meals: acc.meals + item.quantity,
        price: acc.price + item.price * item.quantity,
      }),
      { meals: 0, price: 0 }
    )
  }

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const id = active.id as string
    setActiveId(id)

    // Find the active item and remember its column
    for (const col of columns) {
      const item = col.items.find((i) => i.id === id)
      if (item) {
        setActiveItem(item)
        setDragStartColumnId(col.id)
        break
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveItem(null)

    if (!over) {
      setDragStartColumnId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Use the column where drag started
    const activeColumnId = dragStartColumnId
    // For over, check if it's a column ID first, then find item's column
    const overColumnId = columns.find(c => c.id === overId)?.id || findColumn(overId) || overId

    console.log('DragEnd:', { activeId, overId, activeColumnId, overColumnId, dragStartColumnId })

    // Reset drag start column
    setDragStartColumnId(null)

    if (!activeColumnId || !overColumnId) return

    // If dragging over itself or same column, just reorder
    if (activeColumnId === overColumnId) {
      const column = getColumn(activeColumnId)
      if (!column) return

      const oldIndex = column.items.findIndex((i) => i.id === activeId)
      const newIndex = column.items.findIndex((i) => i.id === overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newItems = arrayMove(column.items, oldIndex, newIndex)
        const resequenced = newItems.map((item, idx) => ({
          ...item,
          deliverySequence: idx + 1,
        }))

        setColumns((prev) =>
          prev.map((col) =>
            col.id === activeColumnId ? { ...col, items: resequenced } : col
          )
        )

        // Save reorder to backend
        deliveryRunsApi.reorderItems(resequenced.map((i) => i.id))
          .then(() => loadData())
          .catch((err) => {
            console.error('Reorder failed:', err)
            setError('Zmena poradia zlyhala: ' + (err.response?.data?.error || err.message))
            loadData()
          })
      }
      return
    }

    // Different columns - move item
    const targetRunId = overColumnId === 'unassigned' ? null : overColumnId
    deliveryRunsApi.moveItems([activeId], targetRunId)
      .then(() => loadData())
      .catch((err) => {
        console.error('Move failed:', err)
        setError('Presun zlyhal: ' + (err.response?.data?.error || err.message))
        loadData()
      })
  }

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading && columns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Rozvozové jazdy
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <button
              onClick={bootstrapRuns}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              <Copy className="w-4 h-4" />
              Preniesť jazdy
            </button>
            <button
              onClick={autoAssign}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Auto-priradenie
            </button>
            <button
              onClick={exportRuns}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Selection bar */}
        {selectedItems.size > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              Vybraných: {selectedItems.size} (Shift+klik pre rozsah, Ctrl+klik pre viacero)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600">Presunúť do:</span>
              {columns
                .filter((col) => col.id !== 'unassigned')
                .map((col) => (
                  <button
                    key={col.id}
                    onClick={() => moveSelectedToRun(col.id)}
                    className="px-3 py-1 bg-white border border-blue-300 rounded text-sm hover:bg-blue-50"
                  >
                    {col.name}
                  </button>
                ))}
              <button
                onClick={() => moveSelectedToRun('unassigned')}
                className="px-3 py-1 bg-white border border-blue-300 rounded text-sm hover:bg-blue-50"
              >
                Nepriradené
              </button>
              <button
                onClick={() => { setSelectedItems(new Set()); setLastSelectedId(null) }}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
              >
                Zrušiť
              </button>
            </div>
          </div>
        )}

        {/* New Run Form */}
        {showNewRunForm && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Nová jazda</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Názov jazdy *"
                value={newRun.name}
                onChange={(e) => setNewRun({ ...newRun, name: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Vodič"
                value={newRun.driverName}
                onChange={(e) => setNewRun({ ...newRun, driverName: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Telefón"
                value={newRun.driverPhone}
                onChange={(e) => setNewRun({ ...newRun, driverPhone: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Vozidlo"
                value={newRun.vehicleInfo}
                onChange={(e) => setNewRun({ ...newRun, vehicleInfo: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="time"
                value={newRun.timeFrom}
                onChange={(e) => setNewRun({ ...newRun, timeFrom: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="time"
                value={newRun.timeTo}
                onChange={(e) => setNewRun({ ...newRun, timeTo: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={createRun}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Vytvoriť
              </button>
              <button
                onClick={() => setShowNewRunForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Zrušiť
              </button>
            </div>
          </div>
        )}

        {/* Trello Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-4">
            {columns.map((column) => {
              const totals = getColumnTotals(column)
              return (
                <DroppableColumn
                  key={column.id}
                  id={column.id}
                  className="flex-shrink-0 w-80"
                >
                  <div className="bg-gray-100 rounded-lg p-4 h-full">
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {column.name}
                        </h3>
                        {column.driverName && (
                          <p className="text-xs text-gray-500">
                            {column.driverName}{' '}
                            {column.driverPhone && `• ${column.driverPhone}`}
                          </p>
                        )}
                        {column.timeFrom && (
                          <p className="text-xs text-gray-500">
                            {column.timeFrom} - {column.timeTo}
                          </p>
                        )}
                      </div>
                      {column.id !== 'unassigned' && (
                        <button
                          onClick={() => deleteRun(column.id)}
                          className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Totals */}
                    <div className="mb-3 text-xs text-gray-600 bg-white rounded p-2 flex justify-between">
                      <span>
                        <span className="font-bold">{totals.meals}</span> obedy
                      </span>
                      <span>
                        <span className="font-bold">{totals.price.toFixed(2)}</span> €
                      </span>
                    </div>

                    {/* Items */}
                    <SortableContext
                      items={column.items.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="min-h-[100px]">
                        {column.items.map((item) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            isSelected={selectedItems.has(item.id)}
                            onSelect={(e) => toggleItemSelection(item.id, e)}
                            onMarkDelivered={() => markDelivered(item.id)}
                            onMarkFailed={() => markFailed(item.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </DroppableColumn>
              )
            })}

            {/* Add Run Button */}
            <div className="flex-shrink-0 w-80">
              <button
                onClick={() => setShowNewRunForm(true)}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-6 h-6 mr-2" />
                Nová jazda
              </button>
            </div>
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeId && activeItem ? (
              <div className="bg-white rounded-lg p-3 shadow-lg border-2 border-blue-500 rotate-2 opacity-90 w-72">
                <p className="text-sm font-medium">{activeItem.userName}</p>
                <p className="text-xs text-gray-500">
                  {activeItem.deliveryAddress}
                </p>
                <p className="text-xs text-gray-600">
                  {activeItem.quantity}x {activeItem.menuItemName}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
