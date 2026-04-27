// ============================================
// GALAXIA OBEDY 3.0 - TypeScript Types
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
  isSenior: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ----- Menu Items (Knižnica jedál) -----
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  seniorPrice?: number;
  allergens: string[];
  deadlineType: 'standard' | 'express';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----- Daily Menu (Denná ponuka) -----
export interface DailyMenu {
  id: string;
  date: string; // ISO date string
  menuItemId: string;
  menuItem: MenuItem;
  menuSlot: 'MenuA' | 'MenuB' | 'Soup' | 'Special';
  deadlineTimestamp: string; // ISO timestamp
  maxQuantity?: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----- Delivery Plan Items (Živý plán) -----
export interface DeliveryPlanItem {
  id: string;
  userId: string;
  dailyMenuId: string;
  dailyMenu: DailyMenu;
  quantity: number;
  deliveryAddress?: string;
  lastUpdated: Date;
}

// ----- Order History (História dodávok) -----
export interface OrderHistoryItem {
  itemName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderHistory {
  id: string;
  userId: string;
  date: string; // ISO date string
  items: OrderHistoryItem[];
  itemsJson: OrderHistoryItem[];
  totalPrice: number;
  deliveryStatus: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'invoiced' | 'overdue';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ----- Kitchen & Delivery Views -----
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

// ----- API Request/Response Types -----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
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

// Menu Plan
export interface MenuPlanDay {
  date: string;
  items: DailyMenuWithSelection[];
  isPastDeadline: boolean;
}

export interface DailyMenuWithSelection extends DailyMenu {
  userQuantity: number;
  isEditable: boolean;
}

// Set Selection
export interface SetSelectionRequest {
  dailyMenuId: string;
  quantity: number;
}

export interface UpdatePlanDeliveryAddressRequest {
  deliveryAddress?: string;
}

// Admin
export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  allergens?: string[];
  deadlineType?: 'standard' | 'express';
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> {}

export interface CreateDailyMenuRequest {
  date: string;
  menuItemId: string;
  menuSlot: 'MenuA' | 'MenuB' | 'Soup' | 'Special';
  maxQuantity?: number;
}

export interface UpdateOrderStatusRequest {
  deliveryStatus?: OrderHistory['deliveryStatus'];
  paymentStatus?: OrderHistory['paymentStatus'];
  notes?: string;
}

// Settings
export interface DeliverySettings {
  standardDeadlineTime: string;
  expressDeadlineTime: string;
  planningHorizonDays: number;
  currency: string;
}
