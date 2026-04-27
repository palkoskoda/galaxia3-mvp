import axios from 'axios';
import type { ApiResponse, AuthResponse, LoginCredentials, RegisterData, User, MenuItem, DailyMenu, MenuPlan, DeliveryPlanItem, MyPlan, OrderHistory, DailySummary, DashboardStats, DeliverySettings } from '../types';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('galaxia_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('galaxia_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== AUTH =====
export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', credentials),
  
  register: (data: RegisterData) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data),
  
  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me'),
  
  updateProfile: (data: Partial<RegisterData>) =>
    api.put<ApiResponse<User>>('/auth/profile', data),
};

// ===== MENU =====
export const menuApi = {
  // Knižnica jedál
  getItems: () =>
    api.get<ApiResponse<MenuItem[]>>('/menu/items'),
  
  getItem: (id: string) =>
    api.get<ApiResponse<MenuItem>>(`/menu/items/${id}`),
  
  createItem: (data: Partial<MenuItem>) =>
    api.post<ApiResponse<MenuItem>>('/menu/items', data),
  
  updateItem: (id: string, data: Partial<MenuItem>) =>
    api.put<ApiResponse<MenuItem>>(`/menu/items/${id}`, data),
  
  deleteItem: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/menu/items/${id}`),
  
  // Denná ponuka
  getPlan: (days?: number) =>
    api.get<ApiResponse<MenuPlan>>('/menu/plan', { params: { days } }),
  
  getDailyMenu: (from?: string, to?: string) =>
    api.get<ApiResponse<DailyMenu[]>>('/menu/daily', { params: { from, to } }),
  
  createDailyMenu: (data: { date: string; menuItemId: string; menuSlot: string; maxQuantity?: number; deadlineTimestamp?: string }) =>
    api.post<ApiResponse<DailyMenu>>('/menu/daily', data),
  
  deleteDailyMenu: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/menu/daily/${id}`),
};

// ===== PLAN (Živý plán) =====
export const planApi = {
  // HLAVNÝ endpoint pre nastavenie počtu kusov
  setSelection: (dailyMenuId: string, quantity: number) =>
    api.put<ApiResponse<DeliveryPlanItem | { message: string }>>('/plan/selection', {
      dailyMenuId,
      quantity,
    }),

  updateDeliveryAddress: (planId: string, deliveryAddress: string) =>
    api.put<ApiResponse<DeliveryPlanItem>>(`/plan/item/${planId}/delivery-address`, {
      deliveryAddress,
    }),

  resetDeliveryAddress: (planId: string) =>
    api.post<ApiResponse<DeliveryPlanItem>>(`/plan/item/${planId}/reset-delivery-address`),

  applyDefaultAddressForDay: (date: string) =>
    api.post<ApiResponse<{ updatedCount: number }>>(`/plan/day/${date}/apply-default-address`),

  updatePlanOptions: (planId: string, options: { includeSoup?: boolean; includeExtra?: boolean }) =>
    api.put<ApiResponse<DeliveryPlanItem>>(`/plan/item/${planId}/options`, options),

  // Môj plán
  getMyPlan: (from?: string) =>
    api.get<ApiResponse<MyPlan>>('/plan/my', { params: { from } }),
  
  // Súhrn pre deň
  getDaySummary: (date: string) =>
    api.get<ApiResponse<{ totalItems: number; totalPrice: number }>>(`/plan/summary/${date}`),
};

// ===== HISTORY =====
export const historyApi = {
  getMyHistory: (limit?: number, offset?: number) =>
    api.get<ApiResponse<OrderHistory[]>>('/history', { params: { limit, offset } }),
  
  getHistoryItem: (id: string) =>
    api.get<ApiResponse<OrderHistory>>(`/history/${id}`),
  
  // Admin
  getAllHistory: (params?: { from?: string; to?: string; status?: string; limit?: number; offset?: number }) =>
    api.get<ApiResponse<(OrderHistory & { userName: string; userEmail: string })[]>>('/history/admin/all', { params }),
  
  updateStatus: (id: string, data: { deliveryStatus?: string; paymentStatus?: string; notes?: string }) =>
    api.put<ApiResponse<OrderHistory>>(`/history/${id}/status`, data),
};

// ===== ADMIN =====
export const adminApi = {
  getDashboard: () =>
    api.get<ApiResponse<DashboardStats>>('/admin/dashboard'),
  
  getDailySummary: (date: string) =>
    api.get<ApiResponse<DailySummary>>(`/admin/daily-summary/${date}`),
  
  archiveDay: (date: string) =>
    api.post<ApiResponse<{ archived: number; message: string }>>(`/admin/archive-day/${date}`),
  
  getUsers: (params?: { role?: string; search?: string }) =>
    api.get<ApiResponse<User[]>>('/admin/users', { params }),
  
  updateUser: (id: string, data: Partial<User>) =>
    api.put<ApiResponse<User>>(`/admin/users/${id}`, data),
  
  getSettings: () =>
    api.get<ApiResponse<DeliverySettings>>('/admin/settings'),
  
  updateSettings: (settings: Partial<DeliverySettings>) =>
    api.put<ApiResponse<{ message: string }>>('/admin/settings', settings),
};

// ===== CUSTOMER SERVICE (Admin) =====
export const customerServiceApi = {
  searchUsers: (query: string) =>
    api.get<ApiResponse<User[]>>(`/admin/customer-service/search?query=${encodeURIComponent(query)}`),
  
  getUserDetail: (userId: string) =>
    api.get<ApiResponse<{
      user: User & { isActive: boolean };
      currentPlans: Array<{
        planId: string;
        quantity: number;
        deliveryAddress?: string;
        date: string;
        menuSlot: string;
        menuItem: { name: string; price: number };
        isEditable: boolean;
      }>;
      history: Array<{
        date: string;
        items: Array<{ itemName: string; quantity: number; price: number }>;
        totalPrice: number;
      }>;
    }>>(`/admin/customer-service/user/${userId}`),
  
  resetPassword: (userId: string, password?: string) =>
    api.put<ApiResponse<{ message: string; temporaryPassword: string }>>(`/admin/customer-service/user/${userId}/reset-password`, { password }),
  
  updatePlan: (planId: string, quantity: number, deliveryAddress?: string) =>
    api.put<ApiResponse<{ message: string; quantity: number; deliveryAddress?: string }>>(`/admin/customer-service/plan/${planId}`, { quantity, deliveryAddress }),
  
  cancelPlan: (planId: string) =>
    api.delete<ApiResponse<{ message: string; cancelledDate: string }>>(`/admin/customer-service/plan/${planId}`),
  
  createOrder: (userId: string, dailyMenuId: string, quantity: number, deliveryAddress?: string) =>
    api.post<ApiResponse<{ message: string; planId: string; quantity: number; deliveryAddress?: string }>>(`/admin/customer-service/user/${userId}/create-order`, { dailyMenuId, quantity, deliveryAddress }),

  quickCreateCustomer: (data: { firstName: string; lastName: string; phone?: string; email?: string; address?: string }) =>
    api.post<ApiResponse<User & { existing?: boolean }>>('/admin/customer-service/customers', data),

  getIntakeContext: (userId: string, date: string) =>
    api.get<ApiResponse<{
      menu: Array<{
        id: string;
        date: string;
        menuSlot: string;
        deadlineTimestamp: string;
        isLocked: boolean;
        menuItem: { id: string; name: string; price: number };
      }>;
      existingPlans: Array<{
        planId: string;
        dailyMenuId: string;
        menuSlot: string;
        menuItemName: string;
        menuItemPrice: number;
        quantity: number;
        deliveryAddress?: string;
      }>;
      recentOrders: Array<{
        date: string;
        items: Array<{ itemName: string; quantity: number; price: number }>;
        totalPrice: number;
      }>;
      futurePlans: Array<{
        date: string;
        items: Array<{ menuSlot: string; itemName: string; quantity: number; price: number }>;
        totalPrice: number;
      }>;
    }>>('/admin/customer-service/intake-context', { params: { userId, date } }),
  
  getTodayOrders: () =>
    api.get<ApiResponse<Array<{
      userId: string;
      userName: string;
      userPhone: string;
      userAddress: string;
      menuItemName: string;
      quantity: number;
      menuSlot: string;
      deadlineTimestamp: string;
      isEditable: boolean;
    }>>>(`/admin/customer-service/today-orders`),
};

// ===== DELIVERY RUNS =====
export const deliveryRunsApi = {
  getRuns: (date: string) =>
    api.get<ApiResponse<{
      runs: Array<{
        id: string;
        date: string;
        name: string;
        driverName?: string;
        driverPhone?: string;
        vehicleInfo?: string;
        timeFrom?: string;
        timeTo?: string;
        notes?: string;
        status: string;
        items: Array<{
          id: string;
          planItemId: string;
          userId: string;
          userName: string;
          userPhone: string;
          deliveryAddress: string;
          deliverySequence: number;
          deliveryStatus: string;
          driverNotes?: string;
          quantity: number;
          menuItemName: string;
          menuItemPrice: number;
        }>;
        totalMeals: number;
        totalPrice: number;
      }>;
      unassigned: {
        items: Array<{
          planItemId: string;
          userId: string;
          userName: string;
          userPhone: string;
          deliveryAddress: string;
          quantity: number;
          menuItemName: string;
          menuItemPrice: number;
        }>;
        totalMeals: number;
        totalPrice: number;
      };
    }>>(`/delivery-runs/${date}`),

  createRun: (data: {
    date: string;
    name: string;
    driverName?: string;
    driverPhone?: string;
    vehicleInfo?: string;
    timeFrom?: string;
    timeTo?: string;
    notes?: string;
  }) =>
    api.post<ApiResponse<{ message: string; runId: string }>>('/delivery-runs', data),

  bootstrapRuns: (date: string) =>
    api.post<ApiResponse<{ createdCount: number; source: 'existing' | 'last-used-day' | 'templates' | 'none' }>>(`/delivery-runs/${date}/bootstrap`),

  getTemplates: () =>
    api.get<ApiResponse<Array<{
      id: string;
      name: string;
      driver_name?: string;
      driver_phone?: string;
      vehicle_info?: string;
      time_from?: string;
      time_to?: string;
      sort_order: number;
      valid_from?: string;
      valid_to?: string;
      is_active: number;
    }>>>('/delivery-runs/templates/list'),

  autoAssign: (date: string) =>
    api.post<ApiResponse<{ message: string; assignedCount: number; unassignedCount: number }>>(`/delivery-runs/${date}/auto-assign`),

  updateRun: (runId: string, data: Partial<{
    name: string;
    driverName: string;
    driverPhone: string;
    vehicleInfo: string;
    timeFrom: string;
    timeTo: string;
    notes: string;
    status: string;
  }>) =>
    api.put<ApiResponse<{ message: string }>>(`/delivery-runs/${runId}`, data),

  deleteRun: (runId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/delivery-runs/${runId}`),

  moveItems: (itemIds: string[], targetRunId: string) =>
    api.post<ApiResponse<{ message: string; movedCount: number }>>('/delivery-runs/items/move', { itemIds, targetRunId }),

  reorderItems: (itemIds: string[]) =>
    api.post<ApiResponse<{ message: string }>>('/delivery-runs/items/reorder', { itemIds }),

  markDelivered: (itemId: string) =>
    api.post<ApiResponse<{ message: string }>>(`/delivery-runs/items/${itemId}/deliver`),

  markFailed: (itemId: string, reason?: string) =>
    api.post<ApiResponse<{ message: string }>>(`/delivery-runs/items/${itemId}/fail`, { reason }),

  exportRuns: (date: string) =>
    api.get<string>(`/delivery-runs/${date}/export`, { responseType: 'text' }),
};

// ===== ORDER LOCKS =====
export const orderLocksApi = {
  getLockStatus: (planItemId: string) =>
    api.get<ApiResponse<{
      isLocked: boolean;
      lock: {
        id: string;
        lockedAt: string;
        lockReason: string;
        lockType: string;
        lockedByName: string;
      } | null;
    }>>(`/order-locks/${planItemId}`),

  createLock: (data: {
    planItemId: string;
    lockReason: string;
    lockType?: string;
  }) =>
    api.post<ApiResponse<{ message: string; lockId: string }>>('/order-locks', data),

  unlock: (lockId: string, unlockReason?: string) =>
    api.post<ApiResponse<{ message: string }>>(`/order-locks/${lockId}/unlock`, { unlockReason }),

  getLocks: (params?: {
    userId?: string;
    planItemId?: string;
    active?: boolean;
  }) =>
    api.get<ApiResponse<Array<{
      id: string;
      planItemId: string;
      userId: string;
      lockedAt: string;
      lockReason: string;
      lockType: string;
      unlockedAt?: string;
      unlockReason?: string;
      userName: string;
      lockedByName: string;
      unlockedByName?: string;
    }>>>('/order-locks', { params }),
};

export default api;
