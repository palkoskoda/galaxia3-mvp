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
  
  updatePlan: (planId: string, quantity: number) =>
    api.put<ApiResponse<{ message: string; quantity: number }>>(`/admin/customer-service/plan/${planId}`, { quantity }),
  
  cancelPlan: (planId: string) =>
    api.delete<ApiResponse<{ message: string; cancelledDate: string }>>(`/admin/customer-service/plan/${planId}`),
  
  createOrder: (userId: string, dailyMenuId: string, quantity: number) =>
    api.post<ApiResponse<{ message: string; planId: string; quantity: number }>>(`/admin/customer-service/user/${userId}/create-order`, { dailyMenuId, quantity }),
  
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

export default api;
