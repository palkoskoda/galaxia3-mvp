import { create } from 'zustand';
import { planApi, menuApi } from '../services/api';
import type { MenuPlan, MyPlan, DeliveryPlanItem } from '../types';
import toast from 'react-hot-toast';

interface PlanState {
  menuPlan: MenuPlan | null;
  myPlan: MyPlan | null;
  isLoading: boolean;
  isUpdating: boolean;
  
  // Actions
  fetchMenuPlan: (days?: number) => Promise<void>;
  fetchMyPlan: (from?: string) => Promise<void>;
  setSelection: (dailyMenuId: string, quantity: number) => Promise<void>;
  updatePlanOptions: (planId: string, options: { includeSoup?: boolean; includeExtra?: boolean }) => Promise<void>;
  updateLocalQuantity: (dailyMenuId: string, quantity: number) => void;
  getDayTotal: (date: string) => number;
  getDayItems: (date: string) => DeliveryPlanItem[];
}

export const usePlanStore = create<PlanState>()((set, get) => ({
  menuPlan: null,
  myPlan: null,
  isLoading: false,
  isUpdating: false,

  fetchMenuPlan: async (days = 14) => {
    set({ isLoading: true });
    try {
      const response = await menuApi.getPlan(days);
      set({ menuPlan: response.data.data! });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Nepodarilo sa načítať menu';
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyPlan: async (from) => {
    set({ isLoading: true });
    try {
      const response = await planApi.getMyPlan(from);
      set({ myPlan: response.data.data! });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Nepodarilo sa načítať plán';
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  // Optimistic update - update UI immediately
  updateLocalQuantity: (dailyMenuId, quantity) => {
    const { menuPlan } = get();
    if (!menuPlan) return;

    const newMenuPlan = { ...menuPlan };
    
    for (const date of Object.keys(newMenuPlan)) {
      const day = newMenuPlan[date];
      const itemIndex = day.items.findIndex(item => item.id === dailyMenuId);
      if (itemIndex !== -1) {
        day.items[itemIndex] = {
          ...day.items[itemIndex],
          userQuantity: quantity,
        };
        break;
      }
    }

    set({ menuPlan: newMenuPlan });
  },

  updatePlanOptions: async (planId, options) => {
    set({ isUpdating: true });
    try {
      await planApi.updatePlanOptions(planId, options);
      await get().fetchMyPlan();
      toast.success('Možnosti objednávky aktualizované');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Aktualizácia možností zlyhala';
      toast.error(message);
      throw error;
    } finally {
      set({ isUpdating: false });
    }
  },

  setSelection: async (dailyMenuId, quantity) => {
    const { updateLocalQuantity, fetchMenuPlan, fetchMyPlan } = get();
    
    // Optimistic update - show change immediately
    const previousQuantity = (() => {
      const { menuPlan } = get();
      if (!menuPlan) return 0;
      for (const date of Object.keys(menuPlan)) {
        const item = menuPlan[date].items.find(i => i.id === dailyMenuId);
        if (item) return item.userQuantity;
      }
      return 0;
    })();

    updateLocalQuantity(dailyMenuId, quantity);
    set({ isUpdating: true });

    try {
      await planApi.setSelection(dailyMenuId, quantity);
      
      // Refresh from server to confirm
      await fetchMenuPlan();
      await fetchMyPlan();
      
      if (quantity === 0) {
        toast.success('Položka odstránená');
      } else {
        toast.success('Plán aktualizovaný');
      }
    } catch (error: any) {
      // Revert on error
      updateLocalQuantity(dailyMenuId, previousQuantity);
      const message = error.response?.data?.error || 'Aktualizácia zlyhala';
      toast.error(message);
      throw error;
    } finally {
      set({ isUpdating: false });
    }
  },

  getDayTotal: (date) => {
    const { myPlan } = get();
    if (!myPlan || !myPlan[date]) return 0;
    return myPlan[date].totalPrice;
  },

  getDayItems: (date) => {
    const { myPlan } = get();
    if (!myPlan || !myPlan[date]) return [];
    return myPlan[date].items;
  },
}));
