import { TZDate } from '@date-fns/tz';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const TIMEZONE = 'America/Bogota';

export const getColombiaDate = (date: Date): TZDate => {
  return new TZDate(date, TIMEZONE);
};

export const formatColombiaDate = (date: Date): string => {
  const colombiaDate = getColombiaDate(date);
  return format(colombiaDate, 'EEEE, d MMMM yyyy', {
    locale: es,
  }).toUpperCase();
};

export const getDateKey = (date: Date): string => {
  const colombiaDate = getColombiaDate(date);
  return format(colombiaDate, 'yyyy-MM-dd');
};

export const getStartEndDayInColombia = (date: Date) => {
  const colombiaDate = getColombiaDate(date);
  const start = startOfDay(colombiaDate);
  const end = endOfDay(colombiaDate);
  return { start, end };
};

export const toColombiaDate = (date: Date): TZDate => {
  return new TZDate(date, TIMEZONE);
};
