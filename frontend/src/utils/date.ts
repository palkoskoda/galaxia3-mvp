import { format, parseISO, isBefore, isSameDay } from 'date-fns';
import { sk } from 'date-fns/locale';

export const formatDate = (date: string | Date, formatStr: string = 'd. MMMM yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: sk });
};

export const formatDateShort = (date: string | Date): string => {
  return formatDate(date, 'd.M.');
};

export const formatDateWithDay = (date: string | Date): string => {
  return formatDate(date, 'EEEE d. MMMM');
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
};

export const isDeadlinePassed = (deadlineTimestamp: string): boolean => {
  return isBefore(parseISO(deadlineTimestamp), new Date());
};

export const getDeadlineText = (deadlineTimestamp: string): string => {
  const deadline = parseISO(deadlineTimestamp);
  const now = new Date();
  
  if (isBefore(deadline, now)) {
    return 'Uzávierka prebehla';
  }
  
  return `Uzávierka: ${formatTime(deadline)}`;
};

export const getDayName = (date: string | Date): string => {
  return formatDate(date, 'EEEE');
};

export const isToday = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isSameDay(d, new Date());
};

export const isTomorrow = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(d, tomorrow);
};
