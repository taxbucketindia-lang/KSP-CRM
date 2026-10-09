// Company ki official holiday list (Holidays page + Salary calculation dono yahin se lete hain)
export const HOLIDAYS = [
  { id: 1, date: '2026-01-26', displayDate: '26 January 2026', day: 'Monday', name: 'Republic Day', icon: '🇮🇳' },
  { id: 2, date: '2026-03-04', displayDate: '4 March 2026', day: 'Wednesday', name: 'Holi', icon: '🎨' },
  { id: 3, date: '2026-03-26', displayDate: '26 March 2026', day: 'Thursday', name: 'Ram Navami', icon: '🏹' },
  { id: 4, date: '2026-04-03', displayDate: '3 April 2026', day: 'Friday', name: 'Good Friday', icon: '✝️' },
  { id: 5, date: '2026-05-27', displayDate: '27 May 2026', day: 'Wednesday', name: 'Eid-ul-Zuha (Bakrid)', icon: '🌙' },
  { id: 6, date: '2026-08-15', displayDate: '15 August 2026', day: 'Saturday', name: 'Independence Day', icon: '🪁' },
  { id: 7, date: '2026-08-28', displayDate: '28 August 2026', day: 'Friday', name: 'Raksha Bandhan', icon: '🧵' },
  { id: 8, date: '2026-10-02', displayDate: '2 October 2026', day: 'Friday', name: 'Gandhi Jayanti', icon: '👓' },
  { id: 9, date: '2026-10-20', displayDate: '20 October 2026', day: 'Tuesday', name: 'Dussehra', icon: '🔥' },
  { id: 10, date: '2026-11-09', displayDate: '9 November 2026', day: 'Monday', name: 'Govardhan Puja', icon: '🌸' },
  { id: 11, date: '2026-12-25', displayDate: '25 December 2026', day: 'Friday', name: 'Christmas Day', icon: '🎄' },
];

export const HOLIDAY_DATES = HOLIDAYS.map(h => h.date);
