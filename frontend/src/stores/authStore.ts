import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<RegisterData>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);
          const { user, token } = response.data.data!;
          
          localStorage.setItem('galaxia_token', token);
          set({ user, token, isAuthenticated: true });
          toast.success('Vitajte späť!');
        } catch (error: any) {
          const message = error.response?.data?.error || 'Prihlásenie zlyhalo';
          toast.error(message);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          const { user, token } = response.data.data!;
          
          localStorage.setItem('galaxia_token', token);
          set({ user, token, isAuthenticated: true });
          toast.success('Registrácia úspešná!');
        } catch (error: any) {
          const message = error.response?.data?.error || 'Registrácia zlyhala';
          toast.error(message);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('galaxia_token');
        set({ user: null, token: null, isAuthenticated: false });
        toast.success('Odhlásenie úspešné');
      },

      checkAuth: async () => {
        const token = localStorage.getItem('galaxia_token');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await authApi.getMe();
          set({ user: response.data.data!, token, isAuthenticated: true });
        } catch (error) {
          localStorage.removeItem('galaxia_token');
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.updateProfile(data);
          set({ user: response.data.data! });
          toast.success('Profil aktualizovaný');
        } catch (error: any) {
          const message = error.response?.data?.error || 'Aktualizácia zlyhala';
          toast.error(message);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'galaxia-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
