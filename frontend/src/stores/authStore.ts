import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/api'
import type { User, AuthState, LoginCredentials, RegisterData } from '../types'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(credentials)
          const { user, token } = response.data.data
          
          set({ user, token, isLoading: false })
          localStorage.setItem('token', token)
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true })
        try {
          const response = await authApi.register(data)
          const { user, token } = response.data.data
          
          set({ user, token, isLoading: false })
          localStorage.setItem('token', token)
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({ user: null, token: null })
        localStorage.removeItem('token')
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ user: null, token: null })
          return
        }

        set({ isLoading: true })
        try {
          const response = await authApi.getProfile()
          set({ user: response.data.data, token, isLoading: false })
        } catch (error) {
          set({ user: null, token: null, isLoading: false })
          localStorage.removeItem('token')
        }
      },

      setUser: (user: User | null) => set({ user }),
      setToken: (token: string | null) => set({ token }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)