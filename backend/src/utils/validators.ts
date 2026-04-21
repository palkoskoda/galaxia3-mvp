import { z } from 'zod';

// ----- Auth Validators -----
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// ----- Menu Validators -----
export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  allergens: z.array(z.string()).optional(),
  deadlineType: z.enum(['standard', 'express']).optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

// ----- Daily Menu Validators -----
export const createDailyMenuSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  menuItemId: z.string().min(1, 'Invalid menu item ID'),
  menuSlot: z.enum(['MenuA', 'MenuB', 'Soup', 'Special']),
  maxQuantity: z.number().int().positive().optional(),
  deadlineTimestamp: z.string().optional(), // explicitný čas uzávierky
});

// ----- Selection Validators -----
export const setSelectionSchema = z.object({
  dailyMenuId: z.string().min(1, 'Invalid daily menu ID'),
  quantity: z.number().int().min(0, 'Quantity must be 0 or greater'),
});

// ----- Order History Validators -----
export const updateOrderStatusSchema = z.object({
  deliveryStatus: z.enum(['pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'invoiced', 'overdue']).optional(),
  notes: z.string().optional(),
});

// ----- Date Range Validator -----
export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
