// ============================================
// GALAXIA OBEDY 3.0 - Frontend Types
// ============================================

// ----- Users -----
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin' | 'staff';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----- Menu Items -----
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  allergens: string[];
  category?: string;
  deadlineType: 'standard' | 'express';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----- Daily Menu -----
export interface DailyMenu {
  id: string;
  date: string;
  menuItemId: string;
  menuItem: MenuItem;
  menuSlot: 'MenuA' | 'MenuB' | 'Soup' | 'Special';
  deadlineTimestamp: string;
  maxQuantity?: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyMenuWithSelection extends DailyMenu {
  userQuantity: number;
  isEditable: boolean;
}

// ----- Delivery Plan -----
export interface DeliveryPlanItem {
  id: string;
  userId: string;
  dailyMenuId: string;
  dailyMenu: DailyMenu;
  quantity: number;
  lastUpdated: string;
}

// ----- Order History -----
export interface OrderHistoryItem {
  itemName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderHistory {
  id: string;
  userId: string;
  date: string;
  items: OrderHistoryItem[];
  itemsJson: OrderHistoryItem[];
  totalPrice: number;
  deliveryStatus: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'invoiced' | 'overdue';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ----- Admin Views -----
export interface KitchenSummaryItem {
  menuItemName: string;
  totalQuantity: number;
}

export interface DeliveryDetailItem {
  itemName: string;
  quantity: number;
  price: number;
}

export interface DeliveryDetail {
  userId: string;
  userName: string;
  userAddress?: string;
  userPhone?: string;
  items: DeliveryDetailItem[];
  totalPrice: number;
}

export interface DailySummary {
  date: string;
  isFinal: boolean;
  kitchen: KitchenSummaryItem[];
  deliveries: DeliveryDetail[];
  totals: {
    totalMeals: number;
    totalRevenue: number;
    totalCustomers: number;
  };
}

// ----- API Response -----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ----- Menu Plan -----
export interface MenuPlanDay {
  date: string;
  items: DailyMenuWithSelection[];
  isPastDeadline: boolean;
}

export type MenuPlan = Record<string, MenuPlanDay>;

// ----- My Plan -----
export interface MyPlanDay {
  date: string;
  items: DeliveryPlanItem[];
  totalPrice: number;
}

export type MyPlan = Record<string, MyPlanDay>;

// ----- Dashboard Stats -----
export interface DashboardStats {
  today: {
    totalOrders: number;
    totalMeals: number;
    totalRevenue: number;
  };
  tomorrow: {
    totalOrders: number;
    totalMeals: number;
  };
  activeCustomers: number;
}

// ----- Auth -----
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ----- Settings -----
export interface DeliverySettings {
  standardDeadlineTime: string;
  expressDeadlineTime: string;
  planningHorizonDays: number;
  currency: string;
}
