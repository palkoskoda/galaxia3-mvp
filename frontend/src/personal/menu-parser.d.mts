export interface MenuFood {
  name: string;
  weight: string;
}
export interface MenuMeal extends MenuFood {
  code: 'A' | 'B' | 'C' | 'D';
}
export interface MenuExtra extends MenuFood {
  price?: string;
}
export interface MenuDay {
  date: string;
  label: string;
  soup: MenuFood;
  meals: [MenuMeal, MenuMeal, MenuMeal, MenuMeal];
  extra?: MenuExtra;
}
export function parseMenuHtml(html: string): MenuDay[];
export function menuDayFingerprint(day: MenuDay): string;
