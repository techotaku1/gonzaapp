import { TZDate } from '@date-fns/tz';
import { endOfDay, format, startOfDay } from 'date-fns';
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

// Convierte un Date a string para input type="datetime-local" en zona America/Bogota
export const toColombiaDatetimeLocalString = (date: Date): string => {
  const tzDate = getColombiaDate(date);
  // yyyy-MM-ddTHH:mm
  return format(tzDate, "yyyy-MM-dd'T'HH:mm");
};

// Convierte un string de input type="datetime-local" a Date en zona America/Bogota
export const fromDatetimeLocalStringToColombiaDate = (value: string): Date => {
  // value: 'yyyy-MM-ddTHH:mm'
  // Crear un Date como si el string fuera hora local de Bogotá
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  // Obtener el offset de Bogotá en minutos
  const bogotaOffset = -5 * 60; // UTC-5
  // Crear la fecha en UTC sumando el offset inverso
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // Ajustar a Bogotá restando el offset
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() - bogotaOffset);
  return utcDate;
};
