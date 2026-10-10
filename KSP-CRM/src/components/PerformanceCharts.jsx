import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { can } from '../utils/permissions';
import { istDateKey, istToday } from '../utils/time';
import { TrendingUp, Target, Timer, CalendarCheck, Loader2 } from 'lucide-react';

// 🔴 MY PERFORMANCE: employee ka apna kaam, uske role ke hisaab se.
// Developer -> Development Tasks, baaki team -> Work Management tasks (dono mile hon toh dono).
// Rang colour-blind safe palette se hain; har hisse ke saath naam aur ginti likhi hai (sirf rang par nirbhar nahi).

const COLORS = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const endOfDay = (date) => { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; };

// Work Management task -> ek jaisi shakal
const fromWorkTask = (t) => {
  const done = t.currentStatus === 'Completed';
  return {
    source: 'Work', done,
    cancelled: t.currentStatus === 'Cancelled',
    active: ['In Progress', 'Under Review', 'Approved', 'Correction Required'].includes(t.currentStatus),
    overdue: !done && !!t.isOverdue,
    createdAt: t.createdAt, dueDate: t.dueDate,
    completedAt: done ? (t.completionDate || t.updatedAt) : null
  };
};

// Development task -> ek jaisi shakal
const fromDevTask = (t) => {
  const done = t.status === 'Completed';
  return {
    source: 'Dev', done, cancelled: false,
    active: ['Start', 'In Progress', 'Testing / Review'].includes(t.status),
    overdue: !done && !!t.dueDate && istDateKey(t.dueDate) < istToday(),
    createdAt: t.createdAt, dueDate: t.dueDate,
    completedAt: done ? (t.completedAt || [...(t.remarks || [])].reverse().find(r => r.status === 'Completed')?.date || t.updatedAt) : null,
    hoursSpent: t.hoursSpent || 0, estimatedHours: t.estimatedHours || 0
  };
};

// ============================================================
// DONUT (pie) CHART: hisse + beech me total + naam / ginti wali list
// ============================================================
const Donut = ({ title, hint, segments, centerLabel, emptyText }) => {
  const [hovered, setHovered] = useState(null);
  const shown = segments.filter(s => s.value > 0);
  const total = shown.reduce((sum, s) => sum + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gap = shown.length > 1 ? 3 : 0; // hisson ke beech safed jagah
  let offset = 0;
  const focus = shown.find(s => s.label === hovered);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col min-w-0">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-400 font-medium mb-3">{hint}</p>
      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 text-xs font-semibold text-slate-400 text-center">{emptyText}</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-5 flex-1">
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90" role="img" aria-label={`${title}: ${shown.map(s => `${s.label} ${s.value}`).join(', ')}`}>
              <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
              {shown.map(segment => {
                const length = (segment.value / total) * circumference;
                const dash = Math.max(1, length - gap);
                const circle = (
                  <circle
                    key={segment.label} cx="70" cy="70" r={radius} fill="none"
                    stroke={segment.color} strokeWidth={hovered === segment.label ? 20 : 16}
                    strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
                    style={{ transition: 'stroke-width .15s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(segment.label)} onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`${segment.label}: ${segment.value} (${Math.round((segment.value / total) * 100)}%)`}</title>
                  </circle>
                );
                offset += length;
                return circle;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <p className="text-2xl font-black text-slate-800 leading-none">{focus ? focus.value : total}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1 max-w-[84px] leading-tight">{focus ? focus.label : centerLabel}</p>
            </div>
          </div>
          <div className="w-full space-y-1.5">
            {segments.map(segment => (
              <div
                key={segment.label}
                onMouseEnter={() => setHovered(segment.label)} onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${hovered === segment.label ? 'bg-slate-100' : ''} ${segment.value === 0 ? 'opacity-50' : ''}`}
              >
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: segment.color }}></span>
                <span className="font-semibold text-slate-600 flex-1 truncate">{segment.label}</span>
                <span className="font-black text-slate-800">{segment.value}</span>
                <span className="font-semibold text-slate-400 w-9 text-right">{Math.round((segment.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// BAR CHART: pichhle 6 mahine me kitne task poore hue
// ============================================================
const MonthlyBars = ({ title, hint, data }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col min-w-0">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-400 font-medium mb-4">{hint}</p>
      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 text-xs font-semibold text-slate-400">No completed tasks in the last 6 months.</div>
      ) : (
        <div className="flex-1 flex items-end gap-2 sm:gap-3 h-44 border-b border-slate-200 pb-0">
          {data.map(item => (
            <div key={item.key} className="group flex-1 h-full flex flex-col items-center justify-end" title={`${item.label}: ${item.value} completed`}>
              <span className={`text-[11px] font-black mb-1 ${item.value ? 'text-slate-700' : 'text-slate-300'}`}>{item.value}</span>
              <div
                className="w-full max-w-[44px] rounded-t transition-all group-hover:opacity-80"
                style={{ height: `${item.value ? Math.max(4, (item.value / max) * 100) : 0}%`, backgroundColor: COLORS.blue, minHeight: item.value ? 4 : 0 }}
              ></div>
            </div>
          ))}
        </div>
      )}
      {total > 0 && (
        <div className="flex gap-2 sm:gap-3 mt-1.5">
          {data.map(item => <span key={item.key} className="flex-1 text-center text-[10px] font-bold text-slate-400">{item.label}</span>)}
        </div>
      )}
    </div>
  );
};

// Ek number + uska bar (kitna poora hua)
const Meter = ({ icon: Icon, label, value, detail, percent }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 min-w-0">
    <div className="flex items-center gap-2 mb-2">
      <span className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Icon size={15} /></span>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</p>
    </div>
    <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none">{value}</p>
    <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden mt-2.5">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, percent || 0))}%`, backgroundColor: COLORS.blue }}></div>
    </div>
    <p className="text-[11px] font-semibold text-slate-400 mt-1.5">{detail}</p>
  </div>
);

// workTasks = My Portal ke paas pehle se aaye hue (mere) Work Management tasks: server ko dobara call nahi jata
const PerformanceCharts = ({ attendance = [], monthKey, workTasks = [] }) => {
  const { user } = useContext(AuthContext);
  const [devTasks, setDevTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // 'month' | 'all'

  const isDeveloper = user?.role === 'Developer';
  const useWork = can(user, 'WORK_MANAGEMENT');
  const useDev = isDeveloper || can(user, 'DEV_TASKS');

  useEffect(() => {
    if (!useDev) { setLoading(false); return undefined; }
    let cancelled = false;
    const names = [user.name, user.username].filter(Boolean);
    axios.get(`${import.meta.env.VITE_API_URL}/devtasks`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(res => { if (!cancelled) setDevTasks((res.data?.data || []).filter(t => names.includes(t.assignedTo)).map(fromDevTask)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.token, user.name, user.username, useDev]);

  const tasks = useMemo(
    () => [...(useWork ? workTasks.map(fromWorkTask) : []), ...devTasks].filter(t => !t.cancelled),
    [workTasks, devTasks, useWork]
  );

  const month = monthKey || istToday().slice(0, 7);
  const monthLabel = `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

  // Chune hue period ke task: us mahine me mile ya us mahine me poore hue
  const scoped = useMemo(() => (period === 'all' ? tasks : tasks.filter(t =>
    (t.createdAt && istDateKey(t.createdAt).startsWith(month)) || (t.completedAt && istDateKey(t.completedAt).startsWith(month))
  )), [tasks, period, month]);

  const stats = useMemo(() => {
    const done = scoped.filter(t => t.done);
    const withDue = done.filter(t => t.dueDate && t.completedAt);
    const onTime = withDue.filter(t => new Date(t.completedAt) <= endOfDay(t.dueDate));
    const dev = scoped.filter(t => t.source === 'Dev');
    return {
      total: scoped.length,
      completed: done.length,
      overdue: scoped.filter(t => t.overdue).length,
      active: scoped.filter(t => !t.done && !t.overdue && t.active).length,
      pending: scoped.filter(t => !t.done && !t.overdue && !t.active).length,
      completionRate: scoped.length ? Math.round((done.length / scoped.length) * 100) : 0,
      onTimeRate: withDue.length ? Math.round((onTime.length / withDue.length) * 100) : 0,
      onTime: onTime.length, withDue: withDue.length,
      hoursSpent: Math.round(dev.reduce((sum, t) => sum + t.hoursSpent, 0) * 10) / 10,
      hoursEstimated: Math.round(dev.reduce((sum, t) => sum + t.estimatedHours, 0) * 10) / 10
    };
  }, [scoped]);

  // Attendance: chune hue mahine ka
  const att = useMemo(() => {
    const rows = attendance.filter(a => a.date && a.date.startsWith(month));
    const count = (status) => rows.filter(a => a.status === status).length;
    const present = count('Present'), halfDay = count('Half Day'), wfh = count('WFH'), leave = count('Leave'), absent = count('Absent');
    const working = present + halfDay + wfh + leave + absent;
    return { present, halfDay, wfh, leave, absent, working, rate: working ? Math.round(((present + wfh + halfDay * 0.5) / working) * 100) : 0 };
  }, [attendance, month]);

  // Pichhle 6 mahine me poore hue task
  const trend = useMemo(() => {
    const today = istToday();
    let year = Number(today.slice(0, 4)), index = Number(today.slice(5, 7)) - 1;
    const keys = [];
    for (let i = 0; i < 6; i++) {
      keys.unshift({ key: `${year}-${String(index + 1).padStart(2, '0')}`, label: MONTHS[index] });
      index -= 1;
      if (index < 0) { index = 11; year -= 1; }
    }
    return keys.map(k => ({ ...k, value: tasks.filter(t => t.done && t.completedAt && istDateKey(t.completedAt).startsWith(k.key)).length }));
  }, [tasks]);

  const hasTasks = useWork || useDev;
  const workLabel = useDev && !useWork ? 'Development Tasks' : useDev && useWork ? 'Work + Development Tasks' : 'Work Management Tasks';
  const periodLabel = period === 'all' ? 'All time' : monthLabel;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp size={18} /></span>
          <div>
            <h3 className="text-base font-black text-slate-800">My Performance</h3>
            <p className="text-[11px] text-slate-400 font-medium">{user?.role}{hasTasks ? ` · ${workLabel}` : ''} · Attendance</p>
          </div>
        </div>
        {hasTasks && (
          <div className="flex bg-slate-100 p-0.5 rounded-xl">
            {[['month', monthLabel], ['all', 'All Time']].map(([value, label]) => (
              <button key={value} onClick={() => setPeriod(value)} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${period === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 py-14 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${hasTasks ? (useDev ? 'xl:grid-cols-4' : 'xl:grid-cols-3') : ''}`}>
            {hasTasks && <Meter icon={Target} label="Task Completion" value={`${stats.completionRate}%`} percent={stats.completionRate} detail={`${stats.completed} of ${stats.total} tasks done · ${periodLabel}`} />}
            {hasTasks && <Meter icon={Timer} label="On-Time Delivery" value={stats.withDue ? `${stats.onTimeRate}%` : '—'} percent={stats.onTimeRate} detail={stats.withDue ? `${stats.onTime} of ${stats.withDue} finished by the due date` : 'No completed task with a due date yet'} />}
            {useDev && <Meter icon={Timer} label="Hours Logged" value={`${stats.hoursSpent}h`} percent={stats.hoursEstimated ? (stats.hoursSpent / stats.hoursEstimated) * 100 : 0} detail={stats.hoursEstimated ? `of ${stats.hoursEstimated}h estimated on dev tasks` : 'Log hours in your dev task updates'} />}
            <Meter icon={CalendarCheck} label="Attendance" value={att.working ? `${att.rate}%` : '—'} percent={att.rate} detail={att.working ? `${att.present + att.wfh} full + ${att.halfDay} half of ${att.working} marked days · ${monthLabel}` : `No attendance marked in ${monthLabel}`} />
          </div>

          <div className={`grid grid-cols-1 gap-4 ${hasTasks ? 'lg:grid-cols-3' : ''}`}>
            {hasTasks && (
              <Donut
                title="Task Status" hint={`${workLabel} · ${periodLabel}`} centerLabel="Tasks"
                emptyText={period === 'month' ? `No tasks assigned or completed in ${monthLabel}. Try "All Time".` : 'No tasks assigned to you yet.'}
                segments={[
                  { label: 'Completed', value: stats.completed, color: COLORS.blue },
                  { label: 'In Progress', value: stats.active, color: COLORS.orange },
                  { label: 'Pending', value: stats.pending, color: COLORS.aqua },
                  { label: 'Overdue', value: stats.overdue, color: COLORS.yellow }
                ]}
              />
            )}
            <Donut
              title="Attendance Mix" hint={monthLabel} centerLabel="Days" emptyText={`No attendance marked in ${monthLabel}.`}
              segments={[
                { label: 'Present', value: att.present, color: COLORS.blue },
                { label: 'Half Day', value: att.halfDay, color: COLORS.orange },
                { label: 'WFH', value: att.wfh, color: COLORS.aqua },
                { label: 'Leave', value: att.leave, color: COLORS.yellow },
                { label: 'Absent', value: att.absent, color: COLORS.magenta }
              ]}
            />
            {hasTasks && <MonthlyBars title="Tasks Completed" hint="Last 6 months" data={trend} />}
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceCharts;
