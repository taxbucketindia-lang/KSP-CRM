// 🔴 INDIA TIME (IST): device ya server kisi bhi timezone me ho, time hamesha India ka dikhe
export const IST = 'Asia/Kolkata';

export const formatIstDate = (date, options = {}) =>
  date ? new Date(date).toLocaleDateString('en-IN', { timeZone: IST, ...options }) : '';

export const formatIstTime = (date, options = {}) =>
  date ? new Date(date).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', ...options }) : '';

export const formatIstDateTime = (date) =>
  date ? new Date(date).toLocaleString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

// Kisi bhi date ka India ke hisaab se din: 'YYYY-MM-DD'
export const istDateKey = (date) => new Date(date).toLocaleDateString('en-CA', { timeZone: IST });

// India ke hisaab se aaj ki date: 'YYYY-MM-DD'
export const istToday = () => istDateKey(new Date());

// DB ki date -> <input type="datetime-local"> ke liye India time ('YYYY-MM-DDTHH:mm')
export const toIstInputValue = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 16);
};

// <input type="datetime-local"> ki value (India time) -> sahi ISO instant, taaki server ka timezone asar na kare
export const istInputToIso = (value) => {
  if (!value) return value;
  const d = new Date(`${value.length === 16 ? `${value}:00` : value}+05:30`);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
};
