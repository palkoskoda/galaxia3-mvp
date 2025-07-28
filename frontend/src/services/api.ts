import axios from 'axios'
import type { ApiResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: any; token: string }>>('/auth/login', credentials),
  
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    api.post<ApiResponse<{ user: any; token: string }>>('/auth/register', data),
  
  getProfile: () =>
    api.get<ApiResponse<any>>('/auth/profile'),
}

export const menuApi = {
  getMenu: (filters?: any) =>
    api.get<ApiResponse<any[]>>('/menu', { params: filters }),
  
  getCategories: () =>
    api.get<ApiResponse<any[]>>('/menu/categories'),
  
  getItem: (id: string) =>
    api.get<ApiResponse<any>>(`/menu/${id}`),
}

export const orderApi = {
  createOrder: (data: any) =>
    api.post<ApiResponse<any>>('/orders', data),
  
  getOrders: () =>
    api.get<ApiResponse<any[]>>('/orders'),
  
  getOrder: (id: string) =>
    api.get<ApiResponse<any>>(`/orders/${id}`),
  
  updateOrderStatus: (id: string, status: string) =>
    api.put<ApiResponse<any>>(`/orders/${id}/status`, { status }),
}

export const adminApi = {
  getDashboardStats: () =>
    api.get<ApiResponse<any>>('/admin/dashboard'),
  
  getOrders: (filters?: any) =>
    api.get<ApiResponse<any[]>>('/admin/orders', { params: filters }),
  
  createMenuItem: (data: any) =>
    api.post<ApiResponse<any>>('/admin/menu', data),
  
  updateMenuItem: (id: string, data: any) =>
    api.put<ApiResponse<any>>(`/admin/menu/${id}`, data),
  
  deleteMenuItem: (id: string) =>
    api.delete<ApiResponse<any>>(`/admin/menu/${id}`),
}

export default api