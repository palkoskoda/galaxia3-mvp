import { useEffect, useMemo, useState } from 'react'
import { adminApi, customerServiceApi, menuApi } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Phone, Mail, UserPlus, Search, RotateCcw, Pencil, Trash2 } from 'lucide-react'

type Channel = 'phone' | 'email' | 'in_person'

type FoundUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  role: string
  isActive: boolean
}

type IntakeContext = {
  menu: Array<{
    id: string
    date: string
    menuSlot: string
    deadlineTimestamp: string
    isLocked: boolean
    menuItem: { id: string; name: string; price: number }
  }>
  existingPlans: Array<{
    planId: string
    dailyMenuId: string
    menuSlot: string
    menuItemName: string
    menuItemPrice: number
    quantity: number
    deliveryAddress?: string
  }>
  recentOrders: Array<{
    date: string
    items: Array<{ itemName: string; quantity: number; price: number }>
    totalPrice: number
  }>
  futurePlans: Array<{
    date: string
    items: Array<{ menuSlot: string; itemName: string; quantity: number; price: number }>
    totalPrice: number
  }>
}

const SLOT_LABELS: Record<string, string> = {
  Soup: 'Polievka',
  MenuA: 'Menu A',
  MenuB: 'Menu B',
  Special: 'Špeciál',
}

export default function AdminOrderIntake() {
  const [channel, setChannel] = useState<Channel>('phone')
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoundUser[]>([])
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null)
  const [context, setContext] = useState<IntakeContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '' })
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [customerDraft, setCustomerDraft] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '' })
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planDrafts, setPlanDrafts] = useState<Record<string, { quantity: number; deliveryAddress: string }>>({})
  const [availableDates, setAvailableDates] = useState<string[]>([])

  const groupedMenu = useMemo(() => {
    const grouped: Record<string, IntakeContext['menu']> = {}
    for (const item of context?.menu || []) {
      grouped[item.menuSlot] = grouped[item.menuSlot] || []
      grouped[item.menuSlot].push(item)
    }
    return grouped
  }, [context])

  const totalPrice = useMemo(() => {
    return (context?.menu || []).reduce((sum, item) => {
      return sum + (quantities[item.id] || 0) * item.menuItem.price
    }, 0)
  }, [context, quantities])

  const existingPlansByMenuId = useMemo(() => {
    const map: Record<string, IntakeContext['existingPlans'][number]> = {}
    for (const plan of context?.existingPlans || []) {
      map[plan.dailyMenuId] = plan
    }
    return map
  }, [context])

  const searchUsers = async (value = query) => {
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await customerServiceApi.searchUsers(value.trim())
      setResults(response.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Vyhľadávanie zlyhalo')
    } finally {
      setLoading(false)
    }
  }

  const loadContext = async (user: FoundUser, date = selectedDate) => {
    try {
      setLoading(true)
      setError(null)
      const response = await customerServiceApi.getIntakeContext(user.id, date)
      const data = response.data.data
      setSelectedUser(user)
      setCustomerDraft({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
      })
      setContext(data)
      const nextQuantities: Record<string, number> = {}
      const nextPlanDrafts: Record<string, { quantity: number; deliveryAddress: string }> = {}
      for (const plan of data.existingPlans) {
        nextQuantities[plan.dailyMenuId] = plan.quantity
        nextPlanDrafts[plan.planId] = {
          quantity: plan.quantity,
          deliveryAddress: plan.deliveryAddress || user.address || '',
        }
      }
      setPlanDrafts(nextPlanDrafts)
      setQuantities(nextQuantities)
      setDeliveryAddress(data.existingPlans[0]?.deliveryAddress || user.address || '')
      setResults([])
      setQuery(`${user.firstName} ${user.lastName}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Načítanie kontextu zlyhalo')
    } finally {
      setLoading(false)
    }
  }

  const createCustomer = async () => {
    try {
      setSaving(true)
      setError(null)
      const response = await customerServiceApi.quickCreateCustomer(newCustomer)
      const user = response.data.data as FoundUser
      setShowNewCustomer(false)
      setNewCustomer({ firstName: '', lastName: '', phone: '', email: '', address: '' })
      await loadContext(user)
      setSuccess(user.email.includes('@local.invalid') ? 'Zákazník vytvorený bez reálneho emailu' : 'Zákazník vytvorený')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Vytvorenie zákazníka zlyhalo')
    } finally {
      setSaving(false)
    }
  }

  const applyLastOrder = () => {
    const last = context?.recentOrders?.[0]
    if (!last || !context) return
    const next = { ...quantities }
    for (const oldItem of last.items) {
      const match = context.menu.find((m) => m.menuItem.name === oldItem.itemName)
      if (match) next[match.id] = oldItem.quantity
    }
    setQuantities(next)
  }

  const upsertMenuItem = async (dailyMenuId: string, nextQuantity: number) => {
    if (!selectedUser) return
    const existingPlan = existingPlansByMenuId[dailyMenuId]
    try {
      setSaving(true)
      setSavingItemId(dailyMenuId)
      setError(null)
      if (existingPlan) {
        if (nextQuantity <= 0) {
          await customerServiceApi.cancelPlan(existingPlan.planId)
        } else {
          await customerServiceApi.updatePlan(existingPlan.planId, nextQuantity, deliveryAddress || undefined)
        }
      } else if (nextQuantity > 0) {
        await customerServiceApi.createOrder(selectedUser.id, dailyMenuId, nextQuantity, deliveryAddress || undefined)
      }
      setSuccess(`Objednávka priebežne uložená (${channel})`)
      await loadContext(selectedUser)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Automatické uloženie zlyhalo')
    } finally {
      setSaving(false)
      setSavingItemId(null)
    }
  }

  const saveCustomer = async () => {
    if (!selectedUser) return
    try {
      setSaving(true)
      setError(null)
      await adminApi.updateUser(selectedUser.id, customerDraft)
      const updatedUser = { ...selectedUser, ...customerDraft }
      setSelectedUser(updatedUser)
      setSuccess('Zákazník upravený')
      await loadContext(updatedUser)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Úprava zákazníka zlyhala')
    } finally {
      setSaving(false)
    }
  }

  const saveExistingPlan = async (planId: string) => {
    const draft = planDrafts[planId]
    if (!draft) return
    try {
      setSaving(true)
      setError(null)
      await customerServiceApi.updatePlan(planId, draft.quantity, draft.deliveryAddress)
      setEditingPlanId(null)
      setSuccess('Objednávka upravená')
      if (selectedUser) await loadContext(selectedUser)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Úprava objednávky zlyhala')
    } finally {
      setSaving(false)
    }
  }

  const cancelExistingPlan = async (planId: string) => {
    try {
      setSaving(true)
      setError(null)
      await customerServiceApi.cancelPlan(planId)
      setSuccess('Objednávka zrušená')
      if (selectedUser) await loadContext(selectedUser)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Zrušenie objednávky zlyhalo')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim().length >= 2) {
        searchUsers(query)
      }
    }, 180)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    const loadAvailableDates = async () => {
      try {
        const response = await menuApi.getDailyMenu('2026-04-24', '2026-05-15')
        const dates = Array.from(new Set((response.data.data || []).map((item: any) => item.date))).sort()
        setAvailableDates(dates)
        if (dates.length > 0 && !dates.includes(selectedDate)) {
          const nextDate = dates.find((d) => d >= selectedDate) || dates[0]
          setSelectedDate(nextDate)
          setSuccess(`Prepol som dátum na najbližší dostupný deň s ponukou: ${nextDate}`)
        }
      } catch {
        // ignore
      }
    }
    loadAvailableDates()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      loadContext(selectedUser, selectedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prijať objednávku</h1>
            <p className="text-sm text-gray-600">Telefón, email alebo ručný vstup bez zbytočného klikania.</p>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">{success}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'phone', label: 'Telefón', icon: Phone },
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'in_person', label: 'Osobne', icon: UserPlus },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.id}
                      onClick={() => setChannel(option.id as Channel)}
                      className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${channel === option.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </button>
                  )
                })}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="ml-auto px-3 py-2 border rounded-lg"
                />
              </div>
              {availableDates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableDates.slice(0, 8).map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-3 py-1 rounded-full text-sm border ${selectedDate === date ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Meno, telefón, email, adresa"
                  className="px-3 py-2 border rounded-lg"
                />
                <button onClick={searchUsers} className="px-4 py-2 bg-slate-700 text-white rounded-lg flex items-center gap-2">
                  <Search className="w-4 h-4" /> Hľadať
                </button>
                <button onClick={() => setShowNewCustomer((v) => !v)} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Nový zákazník
                </button>
              </div>

              {showNewCustomer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
                  <input placeholder="Meno" value={newCustomer.firstName} onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })} className="px-3 py-2 border rounded-lg" />
                  <input placeholder="Priezvisko" value={newCustomer.lastName} onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })} className="px-3 py-2 border rounded-lg" />
                  <input placeholder="Telefón" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="px-3 py-2 border rounded-lg" />
                  <input placeholder="Email (voliteľné)" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="px-3 py-2 border rounded-lg" />
                  <input placeholder="Adresa" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="px-3 py-2 border rounded-lg md:col-span-2" />
                  <div className="md:col-span-2 flex justify-end">
                    <button onClick={createCustomer} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg">Vytvoriť zákazníka</button>
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                  {results.map((user) => (
                    <button key={user.id} onClick={() => loadContext(user)} className="w-full text-left px-4 py-3 hover:bg-gray-50">
                      <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-gray-600">{user.phone || 'bez telefónu'} • {user.address || 'bez adresy'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              {!selectedUser ? (
                <div className="text-gray-500">Vyber zákazníka alebo založ nového.</div>
              ) : loading && !context ? (
                <LoadingSpinner />
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Objednávka pre {selectedUser.firstName} {selectedUser.lastName}</h2>
                      <p className="text-sm text-gray-600">Kanál: {channel}</p>
                    </div>
                    <button onClick={applyLastOrder} className="px-3 py-2 border rounded-lg text-sm">Objednať ako minule</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border bg-gray-50">
                    <input value={customerDraft.firstName} onChange={(e) => setCustomerDraft({ ...customerDraft, firstName: e.target.value })} className="px-3 py-2 border rounded-lg" placeholder="Meno" />
                    <input value={customerDraft.lastName} onChange={(e) => setCustomerDraft({ ...customerDraft, lastName: e.target.value })} className="px-3 py-2 border rounded-lg" placeholder="Priezvisko" />
                    <input value={customerDraft.phone} onChange={(e) => setCustomerDraft({ ...customerDraft, phone: e.target.value })} className="px-3 py-2 border rounded-lg" placeholder="Telefón" />
                    <input value={customerDraft.email} onChange={(e) => setCustomerDraft({ ...customerDraft, email: e.target.value })} className="px-3 py-2 border rounded-lg" placeholder="Email" />
                    <input value={customerDraft.address} onChange={(e) => setCustomerDraft({ ...customerDraft, address: e.target.value })} className="px-3 py-2 border rounded-lg md:col-span-2" placeholder="Adresa" />
                    <div className="md:col-span-2 flex justify-end">
                      <button onClick={saveCustomer} disabled={saving} className="px-4 py-2 border rounded-lg flex items-center gap-2"><Pencil className="w-4 h-4" /> Uložiť zákazníka</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Predvolená adresa tejto objednávky</label>
                    <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    <p className="mt-1 text-xs text-gray-500">Plus/mínus ukladajú objednávku hneď, bez extra tlačidla.</p>
                  </div>

                  {context.menu.length === 0 ? (
                    <div className="p-4 rounded-lg border bg-amber-50 text-amber-800 space-y-3">
                      <div>Na vybraný deň zatiaľ nie je nahraná ponuka, preto sa objednávka nedá vložiť.</div>
                      {availableDates.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm font-medium">Dostupné dni:</span>
                          {availableDates.map((date) => (
                            <button
                              key={date}
                              onClick={() => setSelectedDate(date)}
                              className={`px-3 py-1 rounded border text-sm ${selectedDate === date ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-amber-300 text-amber-900'}`}
                            >
                              {date}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {Object.entries(groupedMenu).map(([slot, items]) => (
                        <div key={slot} className="border rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-gray-50 font-medium text-gray-800">{SLOT_LABELS[slot] || slot}</div>
                          <div className="divide-y">
                            {items.map((item) => (
                              <div key={item.id} className="px-4 py-3 flex items-center gap-4">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{item.menuItem.name}</div>
                                  <div className="text-sm text-gray-600">{item.menuItem.price.toFixed(2)} €</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    className="px-2 py-1 border rounded"
                                    disabled={savingItemId === item.id}
                                    onClick={() => upsertMenuItem(item.id, Math.max(0, (quantities[item.id] || 0) - 1))}
                                  >
                                    -
                                  </button>
                                  <input
                                    value={quantities[item.id] || 0}
                                    onChange={(e) => setQuantities((q) => ({ ...q, [item.id]: Math.max(0, Number(e.target.value) || 0) }))}
                                    onBlur={(e) => upsertMenuItem(item.id, Math.max(0, Number(e.target.value) || 0))}
                                    className="w-16 text-center px-2 py-1 border rounded"
                                  />
                                  <button
                                    className="px-2 py-1 border rounded"
                                    disabled={savingItemId === item.id}
                                    onClick={() => upsertMenuItem(item.id, (quantities[item.id] || 0) + 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-lg font-semibold">Spolu: {totalPrice.toFixed(2)} €</div>
                    <div className="flex gap-2">
                      <button onClick={() => setQuantities({})} className="px-4 py-2 border rounded-lg flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Reset lokálnych hodnôt</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Už objednané na deň</h3>
              {!context?.existingPlans?.length ? (
                <div className="text-sm text-gray-500">Zatiaľ nič.</div>
              ) : (
                <div className="space-y-2 text-sm">
                  {context.existingPlans.map((plan) => {
                    const draft = planDrafts[plan.planId] || { quantity: plan.quantity, deliveryAddress: plan.deliveryAddress || '' }
                    const editing = editingPlanId === plan.planId
                    return (
                      <div key={plan.planId} className="p-3 rounded-lg bg-gray-50 border space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{SLOT_LABELS[plan.menuSlot] || plan.menuSlot}: {plan.menuItemName}</div>
                            <div>{draft.quantity}× • {(plan.menuItemPrice * draft.quantity).toFixed(2)} €</div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setEditingPlanId(editing ? null : plan.planId)} className="p-2 border rounded"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => cancelExistingPlan(plan.planId)} className="p-2 border rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        {editing && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <button className="px-2 py-1 border rounded" onClick={() => setPlanDrafts((p) => ({ ...p, [plan.planId]: { ...draft, quantity: Math.max(0, draft.quantity - 1) } }))}>-</button>
                              <input value={draft.quantity} onChange={(e) => setPlanDrafts((p) => ({ ...p, [plan.planId]: { ...draft, quantity: Math.max(0, Number(e.target.value) || 0) } }))} className="w-16 text-center px-2 py-1 border rounded" />
                              <button className="px-2 py-1 border rounded" onClick={() => setPlanDrafts((p) => ({ ...p, [plan.planId]: { ...draft, quantity: draft.quantity + 1 } }))}>+</button>
                            </div>
                            <input value={draft.deliveryAddress} onChange={(e) => setPlanDrafts((p) => ({ ...p, [plan.planId]: { ...draft, deliveryAddress: e.target.value } }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Adresa doručenia" />
                            <div className="flex justify-end">
                              <button onClick={() => saveExistingPlan(plan.planId)} className="px-3 py-2 bg-primary-600 text-white rounded-lg">Uložiť</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Objednané na ďalšie dni</h3>
              {!context?.futurePlans?.length ? (
                <div className="text-sm text-gray-500">Zatiaľ nič dopredu.</div>
              ) : (
                <div className="space-y-3 text-sm">
                  {context.futurePlans.map((day) => (
                    <div key={day.date} className="p-3 rounded-lg bg-gray-50 border">
                      <div className="font-medium">{day.date}</div>
                      <div className="text-gray-600">{day.items.map((i) => `${SLOT_LABELS[i.menuSlot] || i.menuSlot}: ${i.quantity}× ${i.itemName}`).join(', ')}</div>
                      <div className="mt-1 font-medium">{day.totalPrice.toFixed(2)} €</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Posledné objednávky</h3>
              {!context?.recentOrders?.length ? (
                <div className="text-sm text-gray-500">Bez histórie.</div>
              ) : (
                <div className="space-y-3 text-sm">
                  {context.recentOrders.map((order) => (
                    <div key={order.date} className="p-3 rounded-lg bg-gray-50 border">
                      <div className="font-medium">{order.date}</div>
                      <div className="text-gray-600">{order.items.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}</div>
                      <div className="mt-1 font-medium">{order.totalPrice.toFixed(2)} €</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
