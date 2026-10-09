import React, { useMemo } from 'react';
import { 
  CalendarDays, Gift, Calendar, Sparkles, CheckCircle2, Clock, 
  Palmtree, PartyPopper, CalendarClock 
} from 'lucide-react';
import { HOLIDAYS } from '../utils/holidays';

const Holidays = () => {
  // Aapki di hui Holiday List
  const holidayData = HOLIDAYS;

  const { upcomingHolidays, pastHolidays, nextHoliday } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];

    holidayData.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      if (holidayDate >= today) {
        upcoming.push(holiday);
      } else {
        past.push(holiday);
      }
    });

    return { 
      upcomingHolidays: upcoming, 
      pastHolidays: past,
      nextHoliday: upcoming.length > 0 ? upcoming[0] : null
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Palmtree size={28} className="text-emerald-600" /> TaxBucket - Holiday List 2026
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Official list of public holidays and observances for the year 2026.</p>
        </div>
      </div>

      {/* METRICS & HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Holidays Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-3xl shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 text-white/10">
            <CalendarDays size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-100 font-bold uppercase tracking-wider text-xs mb-1">Total Holidays in 2026</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black">12</h2>
              <span className="text-indigo-200 font-medium text-sm">Days</span>
            </div>
            <p className="mt-3 text-xs bg-black/20 inline-block px-3 py-1 rounded-lg border border-white/20 backdrop-blur-sm">
              Includes 11 Fixed + 1 Optional
            </p>
          </div>
        </div>

        {/* Optional Holiday Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
            <Gift size={150} />
          </div>
          <div className="relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Optional Leave</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
              <strong className="text-emerald-600">1 Holiday</strong> can be availed as an optional leave by the employee based on their preference during the year.
            </p>
          </div>
        </div>

        {/* Next Upcoming Holiday Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden group border-b-4 border-b-amber-400">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <PartyPopper size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 animate-pulse">Up Next</span>
            </div>
            {nextHoliday ? (
              <>
                <h3 className="text-xl font-black text-slate-800 mt-3 flex items-center gap-2">
                  {nextHoliday.name} {nextHoliday.icon}
                </h3>
                <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                  <CalendarClock size={14} className="text-slate-400"/> 
                  {nextHoliday.displayDate} <span className="mx-1">•</span> {nextHoliday.day}
                </p>
              </>
            ) : (
              <div className="mt-3">
                <h3 className="text-lg font-black text-slate-800">Year Completed</h3>
                <p className="text-sm text-slate-500 font-medium">All holidays for 2026 have passed.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* HOLIDAY LIST TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Calendar size={18} className="text-slate-500"/>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Complete Schedule (2026)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="py-4 px-6 w-16 text-center">No.</th>
                <th className="py-4 px-6">Holiday Name</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Day of Week</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {/* UPCOMING HOLIDAYS */}
              {upcomingHolidays.map((holiday) => (
                <tr key={holiday.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="py-4 px-6 text-center text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">{holiday.id}</td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-lg">{holiday.icon}</span> {holiday.name}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-slate-700">{holiday.displayDate}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {holiday.day}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">
                      <Clock size={12}/> Upcoming
                    </span>
                  </td>
                </tr>
              ))}

              {/* PAST HOLIDAYS (Greyed Out) */}
              {pastHolidays.map((holiday) => (
                <tr key={holiday.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-center text-xs font-bold text-slate-300">{holiday.id}</td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-slate-400 flex items-center gap-2 line-through decoration-slate-300">
                      <span className="text-lg opacity-50 grayscale">{holiday.icon}</span> {holiday.name}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-medium text-slate-400">{holiday.displayDate}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-semibold text-slate-400">
                      {holiday.day}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-2 py-1 rounded-md border border-slate-200">
                      <CheckCircle2 size={12}/> Passed
                    </span>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Holidays;