export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'customer' | 'admin' | 'staff'
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  category?: Category
  imageUrl?: string
  isAvailable: boolean
  dietaryTags: string[]
  allergens: string[]
  preparationTime: number
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
  specialInstructions?: string
}

export interface OrderItem {
  id: string
  menuItemId: string
  menuItem: MenuItem
  quantity: number
  price: number
  specialInstructions?: string
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentIntentId?: string
  scheduledFor?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface CartState {
  items: CartItem[]
  addItem: (item: MenuItem, quantity?: number, specialInstructions?: string) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export interface MenuFilters {
  category?: string
  dietary?: string[]
  available?: boolean
  search?: string
}

export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  todayOrders: number
  todayRevenue: number
  pendingOrders: number
  popularItems: Array<{
    item: MenuItem
    orderCount: number
  }>
}