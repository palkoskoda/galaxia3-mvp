import type { MenuDay } from './menu-parser.mjs';
export type MealCode = 'A' | 'B' | 'C' | 'D';
export type Selections = Record<string, Partial<Record<MealCode, number>>>;
export interface OrderInput { weekStart: string; profile: { name: string; address: string; email: string }; selections: Selections; note: string; sendAt: string | null }
export const MEAL_CODES: MealCode[];
export const LOCKED_STATUSES: string[];
export class OrderError extends Error { status: number; constructor(message: string, status?: number) }
export function isIsoDate(value: unknown): boolean;
export function addDays(date: string, count: number): string;
export function validateWeek(weekStart: string): void;
export function validateSelections(weekStart: string, selections: Selections, requireMeals?: boolean): number;
export function bratislavaInstant(date: string, hour: number, minute: number): Date;
export function mealDeadline(date: string, code: MealCode): Date;
export function normalizeSendAt(value: string | null): string | null;
export function selectedMeals(order: Pick<OrderInput, 'selections'>): {date:string;code:MealCode;quantity:number}[];
export function validateForDelivery(order: OrderInput, days: MenuDay[], now?: Date, scheduled?: boolean): string;
export function formatDate(date: string): string;
export function formatOrderEmail(order: OrderInput, origin: string): {subject:string;text:string};
export function constantTimeEqual(first: unknown, second: unknown): boolean;
