import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartStore, CartItem, MenuItem } from '../types'

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (menuItem: MenuItem, quantity = 1, specialInstructions?: string) => {
        const existingItem = get().items.find(
          (item) => item.menuItem.id === menuItem.id
        )

        if (existingItem) {
          set((state) => ({
            items: state.items.map((item) =>
              item.menuItem.id === menuItem.id
                ? { ...item, quantity: item.quantity + quantity, specialInstructions }
                : item
            ),
          }))
        } else {
          set((state) => ({
            items: [...state.items, { menuItem, quantity, specialInstructions }],
          }))
        }
      },

      removeItem: (menuItemId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.menuItem.id !== menuItemId),
        }))
      },

      updateQuantity: (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.menuItem.id === menuItemId
              ? { ...item, quantity }
              : item
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.menuItem.price * item.quantity,
          0
        )
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)