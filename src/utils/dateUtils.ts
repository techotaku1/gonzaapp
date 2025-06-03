export const getColombiaDate = (date: Date): Date => {
  const colombiaDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  colombiaDate.setMinutes(colombiaDate.getMinutes() + colombiaDate.getTimezoneOffset());
  return colombiaDate;
};

export const formatColombiaDate = (date: Date): string => {
  const colombiaDate = getColombiaDate(date);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  })
    .format(colombiaDate)
    .toUpperCase();
};
