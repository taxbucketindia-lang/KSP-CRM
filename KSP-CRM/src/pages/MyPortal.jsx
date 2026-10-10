import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import {
  Building2, Briefcase, Mail, Phone, Calendar, Clock, CheckCircle2, AlertCircle, Save, LogIn, LogOut, MapPin, ExternalLink, Lock,
  ClipboardList, ListTodo, Timer, Home, Plus, CalendarPlus, TrendingUp, IdCard, CalendarX, AlarmClock, ArrowUpRight, RotateCw, BadgeCheck, Sun, Sunset, Moon, Loader2
} from 'lucide-react';
import MeetingCalendar from '../components/MeetingCalendar';
import SuccessList from '../components/SuccessList';
import PerformanceCharts from '../components/PerformanceCharts';
import { can } from '../utils/permissions';

// 🔴 EMPLOYEE ID CARD ki animation (sirf is page ke liye)
const CARD_STYLES = `
@keyframes mp-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes mp-float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(14px, -18px) scale(1.12); } }
@keyframes mp-shine { 0% { transform: translateX(-140%) skewX(-18deg); } 55%, 100% { transform: translateX(260%) skewX(-18deg); } }
@keyframes mp-ring { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(1.55); opacity: 0; } }
@keyframes mp-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.mp-scene { perspective: 1400px; }
.mp-card { position: relative; transform-style: preserve-3d; transition: transform .75s cubic-bezier(.2, .8, .2, 1); }
.mp-card.is-flipped { transform: rotateY(180deg); }
.mp-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; border-radius: 1.5rem; }
.mp-back { transform: rotateY(180deg); }
.mp-bg { background: linear-gradient(125deg, #0f172a, #1e3a8a, #4338ca, #0f766e, #0f172a); background-size: 300% 300%; animation: mp-gradient 14s ease infinite; }
.mp-orb { position: absolute; border-radius: 9999px; filter: blur(28px); animation: mp-float 9s ease-in-out infinite; }
.mp-shine { position: absolute; top: 0; bottom: 0; width: 35%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent); animation: mp-shine 5.5s ease-in-out infinite; }
.mp-ring { position: absolute; inset: 0; border-radius: 1.25rem; border: 2px solid rgba(255,255,255,.7); animation: mp-ring 2.2s ease-out infinite; }
.mp-rise { animation: mp-rise .5s ease both; }
@media (prefers-reduced-motion: reduce) {
  .mp-bg, .mp-orb, .mp-shine, .mp-ring, .mp-rise { animation: none; }
  .mp-card { transition: none; }
}
`;

const NO_PUNCH_STATUSES = ['Absent', 'Leave', 'Weekly Off', 'Holiday'];

const statusStyle = (status) => {
  if (status === 'Present' || status === 'WFH') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'Half Day') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'Absent') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'Leave') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (status === 'Weekly Off' || status === 'Holiday') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-slate-200 bg-white text-slate-500';
};

// "7h 30m" -> minutes
const toMinutes = (text) => {
  const match = /(\d+)h\s*(\d+)m/.exec(String(text || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
};
const hoursText = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const tenureText = (joiningDate) => {
  if (!joiningDate) return '';
  const start = new Date(joiningDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return 'Joined this month';
  const years = Math.floor(months / 12);
  return [years ? `${years} yr` : '', months % 12 ? `${months % 12} mo` : ''].filter(Boolean).join(' ');
};

const StatTile = ({ icon: Icon, label, value, tone, hint, delay = 0 }) => (
  <div className="mp-rise bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all min-w-0" style={{ animationDelay: `${delay}ms` }}>
    <span className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${tone}`}><Icon size={17} /></span>
    <div className="min-w-0">
      <p className="text-lg sm:text-xl font-black text-slate-800 leading-none truncate">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5 truncate">{label}</p>
      {hint && <p className="text-[10px] font-semibold text-slate-400 truncate">{hint}</p>}
    </div>
  </div>
);

// ============================================================
// ANIMATED EMPLOYEE ID CARD (click karne par palat-ta hai)
// ============================================================
const EmployeeCard = ({ profile, user, onDuty }) => {
  const [flipped, setFlipped] = useState(false);
  const name = profile?.name || user?.name || 'Employee';
  const detail = (Icon, label, value) => (
    <div className="flex items-center gap-3">
      <span className="h-8 w-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0"><Icon size={14} className="text-blue-200" /></span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200/70">{label}</p>
        <p className="text-xs font-bold text-white truncate">{value || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <div className="mp-scene mp-rise h-full min-h-[360px] sm:min-h-[400px]">
      <div
        className={`mp-card h-full min-h-[360px] sm:min-h-[400px] cursor-pointer ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped(prev => !prev)} role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFlipped(prev => !prev)}
        title="Click to flip the card"
      >
        {/* FRONT */}
        <div className="mp-face mp-bg shadow-xl text-white p-5 sm:p-6 flex flex-col">
          <span className="mp-orb h-32 w-32 bg-blue-400/30 -top-8 -right-6"></span>
          <span className="mp-orb h-28 w-28 bg-emerald-400/25 bottom-4 -left-8" style={{ animationDelay: '-4s' }}></span>
          <span className="mp-shine"></span>

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-black tracking-tight">TaxBucket</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-200/80">Employee ID Card</p>
            </div>
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${onDuty ? 'bg-emerald-400/15 border-emerald-300/40 text-emerald-200' : 'bg-white/10 border-white/15 text-blue-100'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${onDuty ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`}></span>
              {onDuty ? 'On Duty' : 'Off Duty'}
            </span>
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center text-center py-4">
            <div className="relative h-24 w-24 mb-4">
              <span className="mp-ring"></span>
              <div className="relative h-24 w-24 rounded-[1.25rem] bg-white text-blue-700 flex items-center justify-center font-black text-4xl shadow-2xl border-2 border-white/40">
                {name.charAt(0).toUpperCase()}
              </div>
            </div>
            <h2 className="text-xl font-black leading-tight">{name}</h2>
            <p className="text-xs font-semibold text-blue-100 mt-1">{profile?.designation || user?.role || 'Team Member'}</p>
            {profile?.department && <p className="text-[11px] text-blue-200/70">{profile.department}</p>}
          </div>

          <div className="relative flex items-end justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200/70">Employee ID</p>
              <p className="text-base font-black font-mono tracking-wider flex items-center gap-1.5">{profile?.empId || '—'} <BadgeCheck size={15} className="text-emerald-300" /></p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-200/80"><RotateCw size={11} /> Tap to flip</span>
          </div>
        </div>

        {/* BACK */}
        <div className="mp-face mp-back mp-bg shadow-xl text-white p-5 sm:p-6 flex flex-col">
          <span className="mp-orb h-32 w-32 bg-indigo-400/30 -bottom-8 -right-6"></span>
          <div className="relative flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/80">Profile Details</p>
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-200/80"><RotateCw size={11} /> Tap to flip</span>
          </div>
          <div className="relative space-y-3 flex-1">
            {detail(Briefcase, 'Designation', [profile?.designation, profile?.department].filter(Boolean).join(' · '))}
            {detail(Building2, 'Company', [profile?.companyName, profile?.employmentType].filter(Boolean).join(' · '))}
            {detail(Phone, 'Mobile', profile?.mobile)}
            {detail(Mail, 'Email', profile?.email || user?.email)}
            {detail(Calendar, 'Joined On', profile?.joiningDate ? `${new Date(profile.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${tenureText(profile.joiningDate) ? ` · ${tenureText(profile.joiningDate)}` : ''}` : '')}
          </div>
          <p className="relative text-[9px] text-blue-200/60 font-medium mt-3">If any detail is wrong, please ask HR / Admin to update it in Employee Master.</p>
        </div>
      </div>
    </div>
  );
};

const MyPortal = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const [myProfile, setMyProfile] = useState(null);

  // 🔴 NAYA: All Attendance Data and Month Filter State
  const [allAttendance, setAllAttendance] = useState([]);

  // Date Utilities
  const offset = new Date().getTimezoneOffset() * 60000;
  const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];
  const currentMonthStr = localToday.substring(0, 7); // e.g., "2026-10"

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // 🔴 LOCK STATES
  const [isStatusLocked, setIsStatusLocked] = useState(false);
  const [isInTimeLocked, setIsInTimeLocked] = useState(false);
  const [isOutTimeLocked, setIsOutTimeLocked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [todayRecord, setTodayRecord] = useState({
    date: localToday,
    inTime: '',
    outTime: '',
    inLocation: '',
    outLocation: '',
    totalHours: '',
    status: '',
    remarks: ''
  });

  // Dashboard ke liye: mere tasks, success list ki ginti, chalti ghadi
  const [myTasks, setMyTasks] = useState([]);
  const [todoStats, setTodoStats] = useState({ pending: 0, overdue: 0 });
  const [now, setNow] = useState(new Date());
  const canSeeWork = can(user, 'WORK_MANAGEMENT');

  // 🔴 QUICK ADD: page par kahin se bhi To-Do ya Meeting ka form seedha khul jata hai (neeche scroll nahi karna padta)
  const [todoSignal, setTodoSignal] = useState(0);
  const [meetingSignal, setMeetingSignal] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  // 🔴 TOGGLE: 'performance' (Success List, Calendar, charts) | 'profile' (ID card, attendance, sheet)
  const [tab, setTab] = useState('performance');
  // Success List aur Calendar "My Performance" tab me hain, isliye add karte waqt wahi tab khulta hai
  const addTodo = () => { setQuickOpen(false); setTab('performance'); setTodoSignal(n => n + 1); };
  const addMeeting = () => { setQuickOpen(false); setTab('performance'); setMeetingSignal(n => n + 1); };
  const jumpTo = (id) => {
    setTab(id === 'attendance-sheet' || id === 'my-profile' ? 'profile' : 'performance');
    // Tab dikhne ke baad us hisse tak le jao
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };

      const empRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers });

      const me = empRes.data.find(emp =>
        emp.email === user.email || (emp.userId && (emp.userId._id === user._id || emp.userId === user._id))
      );

      if (me) {
        setMyProfile(me);

        // Fetch ALL attendance records for this employee
        const attRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance?employee=${me._id}`, { headers });
        setAllAttendance(attRes.data || []);

        // Find today's specific record to set up the punching widget
        const todayData = (attRes.data || []).find(a => a.date && a.date.startsWith(localToday));

        if (todayData) {
          setTodayRecord({
            date: todayData.displayDate || localToday,
            inTime: todayData.inTime || '',
            outTime: todayData.outTime || '',
            inLocation: todayData.inLocation || '',
            outLocation: todayData.outLocation || '',
            totalHours: todayData.totalHours || '',
            status: todayData.status || '',
            remarks: todayData.remarks || ''
          });

          // 🔴 CHECKING LOCKS BASED ON SAVED DATA
          if (todayData.status) setIsStatusLocked(true);
          if (todayData.inTime) setIsInTimeLocked(true);
          if (todayData.outTime) setIsOutTimeLocked(true);
        } else {
          // If no data exists for today, set default to Present and keep unlocked
          setTodayRecord(prev => ({ ...prev, status: 'Present' }));
        }
      }
    } catch (error) {
      toast.error("Failed to load your profile data.");
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [user]);

  // Mujhe diye gaye Work Management tasks (sirf padhne ke liye, chhota sa summary)
  useEffect(() => {
    if (!canSeeWork) return undefined;
    let cancelled = false;
    axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(res => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setMyTasks(list.filter(t => String(t.assignedTo?._id || t.assignedTo) === String(user._id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user.token, user._id, canSeeWork]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // 🔴 Notification / purane link se aaye: sahi tab khol kar usi hisse tak le jao
  // (#success-list = To-Do reminder, #my-calendar = Meeting reminder, #attendance-sheet)
  useEffect(() => {
    const id = location.hash.slice(1);
    if (loading || !['success-list', 'my-calendar', 'attendance-sheet'].includes(id)) return undefined;
    setTab(id === 'attendance-sheet' ? 'profile' : 'performance');
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => clearTimeout(timer);
    // location.key: wahi notification dobara dabane par bhi chale
  }, [loading, location.hash, location.key]);

  // GEOLOCATION FETCH FUNCTION
  const fetchCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation is not supported by your browser.");
      } else {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

            try {
              const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (res.data && res.data.display_name) {
                const addressParts = res.data.display_name.split(',');
                const shortAddress = addressParts.slice(0, 3).join(',');
                resolve(`${shortAddress}|${googleMapsLink}`);
              } else {
                resolve(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}|${googleMapsLink}`);
              }
            } catch (err) {
              resolve(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}|${googleMapsLink}`);
            }
          },
          () => {
            reject("Location access denied or failed.");
          }
        );
      }
    });
  };

  const calculateHours = (record) => {
    if (record.inTime && record.outTime) {
      const [inH, inM] = record.inTime.split(':').map(Number);
      const [outH, outM] = record.outTime.split(':').map(Number);
      let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMins < 0) diffMins += 24 * 60;
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      record.totalHours = `${h}h ${m}m`;
    }
    return record;
  };

  const handleRecordChange = (field, value) => {
    const updated = { ...todayRecord, [field]: value };
    setHasUnsavedChanges(true);

    if (field === 'inTime' || field === 'outTime') {
      const inT = updated.inTime;
      const outT = updated.outTime;

      if (inT && outT) {
        const [inH, inM] = inT.split(':').map(Number);
        const [outH, outM] = outT.split(':').map(Number);

        let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMins < 0) diffMins += 24 * 60;

        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        updated.totalHours = `${h}h ${m}m`;
      } else {
        updated.totalHours = '';
      }
    }

    if (field === 'status' && NO_PUNCH_STATUSES.includes(value)) {
      updated.inTime = '';
      updated.outTime = '';
      updated.inLocation = '';
      updated.outLocation = '';
      updated.totalHours = '';
    }

    setTodayRecord(updated);
  };

  // Attendance save karna (punch ke turant baad bhi yahi chalta hai)
  const saveAttendance = async (record, successMessage) => {
    if (!myProfile) return false;
    if (!record.status) {
      toast.error("Please select a status (Present, Absent, etc.) first.");
      return false;
    }

    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };

      const payload = {
        employee: myProfile._id,
        companyName: myProfile.companyName || 'SkyEdge Taxbucket India',
        date: localToday,
        inTime: record.inTime,
        outTime: record.outTime,
        inLocation: record.inLocation,
        outLocation: record.outLocation,
        totalHours: record.totalHours,
        status: record.status,
        remarks: record.remarks
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/hr/attendance`, { records: [payload] }, { headers });
      toast.success(successMessage || "Attendance marked successfully!");
      setHasUnsavedChanges(false);
      await fetchData(true);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark attendance.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 🔴 QUICK PUNCH: ek click me time + location lekar turant save (alag se Save dabane ki zaroorat nahi)
  const punch = async (kind) => {
    const isIn = kind === 'in';
    if (saving || fetchingLocation) return;
    if (isIn ? isInTimeLocked : isOutTimeLocked) return;

    const current = new Date();
    const timeStr = String(current.getHours()).padStart(2, '0') + ':' + String(current.getMinutes()).padStart(2, '0');

    setFetchingLocation(true);
    let locStr = '';
    try {
      locStr = await fetchCurrentLocation();
    } catch (err) {
      toast.error("Could not capture location. Ensure GPS is enabled.");
      locStr = 'Location Denied';
    }
    setFetchingLocation(false);

    const updated = calculateHours({
      ...todayRecord,
      status: todayRecord.status || 'Present',
      ...(isIn ? { inTime: timeStr, inLocation: locStr } : { outTime: timeStr, outLocation: locStr })
    });
    setTodayRecord(updated);

    const saved = await saveAttendance(updated, isIn ? `Punched in at ${timeStr}` : `Punched out at ${timeStr}`);
    // Save na ho paye (network) toh time screen par rehta hai: neeche "Save" dabakar dobara bhej sakte hain
    if (!saved) setHasUnsavedChanges(true);
  };

  const handlePunchIn = () => punch('in');
  const handlePunchOut = () => punch('out');

  // Status / remarks badalne ke baad ka Save button
  const submitAttendance = () => {
    if (!myProfile || !hasUnsavedChanges) return;
    saveAttendance(todayRecord);
  };

  // Location: pata + Google Maps ka link
  const renderLocationDisplay = (locStr, prefix) => {
    const color = prefix === 'IN' ? 'text-blue-600' : 'text-amber-600';
    if (!locStr || locStr === 'System Generated' || locStr === 'Location Denied') {
      return <span className="truncate"><span className={`font-black ${color}`}>{prefix}</span> {locStr || '-'}</span>;
    }
    const [address, link] = locStr.split('|');
    return (
      <span className="flex items-center gap-1 min-w-0">
        <span className={`font-black shrink-0 ${color}`}>{prefix}</span>
        <span className="truncate" title={address}>{address}</span>
        {link && <a href={link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-500 hover:text-blue-700" title="Open in Google Maps"><ExternalLink size={10} /></a>}
      </span>
    );
  };

  // 🔴 Compute Filtered History based on selected month
  const filteredHistory = useMemo(() => {
    const history = allAttendance.filter(a => a.date && a.date.startsWith(selectedMonth));
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allAttendance, selectedMonth]);

  // 🔴 Stats based ONLY on the Selected Month
  const monthStats = useMemo(() => {
    const count = (...statuses) => filteredHistory.filter(a => statuses.includes(a.status)).length;
    const minutes = filteredHistory.reduce((sum, a) => sum + toMinutes(a.totalHours), 0);
    const worked = filteredHistory.filter(a => toMinutes(a.totalHours) > 0).length;
    return {
      present: count('Present'),
      halfDay: count('Half Day'),
      absent: count('Absent'),
      leave: count('Leave'),
      wfh: count('WFH'),
      late: filteredHistory.filter(a => a.isLate).length,
      minutes,
      average: worked ? Math.round(minutes / worked) : 0
    };
  }, [filteredHistory]);

  const taskStats = useMemo(() => {
    const open = myTasks.filter(t => !['Completed', 'Cancelled'].includes(t.currentStatus));
    return {
      open: open.length,
      overdue: open.filter(t => t.isOverdue).length,
      next: [...open].sort((a, b) => new Date(a.dueDate || '2999-01-01') - new Date(b.dueDate || '2999-01-01')).slice(0, 5)
    };
  }, [myTasks]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Loading your portal...</p>
      </div>
    );
  }

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const GreetIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const firstName = (myProfile?.name || user?.name || '').split(' ')[0];
  const noPunch = NO_PUNCH_STATUSES.includes(todayRecord.status);
  const onDuty = !!todayRecord.inTime && !todayRecord.outTime && !noPunch;
  const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dayStep = !myProfile ? '' : noPunch ? `Marked as ${todayRecord.status}` : !todayRecord.inTime ? 'Punch in to start your day' : !isInTimeLocked ? 'Punch in is not saved yet. Press Save below.' : !todayRecord.outTime ? 'You are on duty. Punch out when you finish.' : !isOutTimeLocked ? 'Punch out is not saved yet. Press Save below.' : 'Day completed. See you tomorrow!';

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 pb-12">
      <Toaster position="top-right" />
      <style>{CARD_STYLES}</style>

      {/* FLOATING QUICK BUTTON: scroll karke kahin bhi ho, yahin se To-Do / Meeting add */}
      <div className="fixed bottom-5 right-4 sm:right-6 z-40 flex flex-col items-end gap-2">
        {quickOpen && (
          <>
            <div className="fixed inset-0 -z-10" onClick={() => setQuickOpen(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 w-56 animate-in fade-in slide-in-from-bottom-2">
              <button onClick={addTodo} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"><ListTodo size={16} className="text-indigo-600" /> Add To-Do</button>
              <button onClick={addMeeting} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><CalendarPlus size={16} className="text-violet-600" /> Add Meeting / Reminder</button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button onClick={() => { setQuickOpen(false); jumpTo('success-list'); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50">Go to Success List</button>
              <button onClick={() => { setQuickOpen(false); jumpTo('my-calendar'); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50">Go to Calendar</button>
              {myProfile && <button onClick={() => { setQuickOpen(false); jumpTo('attendance-sheet'); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50">Go to Attendance Sheet</button>}
            </div>
          </>
        )}
        <button
          onClick={() => setQuickOpen(prev => !prev)} title="Quick add"
          className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-900/30 flex items-center justify-center transition-transform active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} className={`transition-transform ${quickOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* LOCATION LOADER OVERLAY */}
      {fetchingLocation && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
               <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-xl animate-in fade-in zoom-in-95">
                   <MapPin className="animate-bounce text-blue-500 mb-2" size={32} />
                   <p className="text-slate-800 font-bold">Capturing GPS Coordinates...</p>
                   <p className="text-xs text-slate-500 mt-1">Please allow location access if prompted.</p>
               </div>
          </div>
      )}

      {/* HERO + QUICK ATTENDANCE (sabse upar: aate hi punch in / out) */}
      <div className="mp-rise relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-4 sm:p-5 md:p-7 shadow-lg">
        <span className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl"></span>
        <span className="absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl"></span>
        <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5 items-center">
          <div className="lg:col-span-2">
            <p className="text-xs font-bold text-blue-200 flex items-center gap-1.5"><GreetIcon size={14} /> {greeting}</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">{firstName ? `Welcome, ${firstName}!` : 'Welcome!'}</h1>
            <p className="text-sm text-blue-100/80 mt-1 font-medium">{dayStep || 'Your attendance, tasks, success list and calendar in one place.'}</p>
            <p className="mt-3 text-xs font-bold text-blue-200">
              <span className="text-2xl font-black font-mono text-white mr-2 align-middle">{now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span>
              {now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={addTodo} className="flex items-center gap-1.5 text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 px-3 py-2 rounded-xl shadow-sm transition-colors"><Plus size={14} strokeWidth={2.5} /> Add To-Do</button>
              <button onClick={addMeeting} className="flex items-center gap-1.5 text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2 rounded-xl transition-colors"><CalendarPlus size={14} /> Add Meeting / Reminder</button>
            </div>
          </div>

          {myProfile && (
            <div className="lg:col-span-3 bg-white/10 border border-white/15 backdrop-blur rounded-2xl p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-blue-100 flex items-center gap-1.5"><Clock size={13} /> Quick Attendance</p>
                <div className="flex items-center gap-2">
                  {todayRecord.totalHours && <span className="text-[11px] font-bold bg-emerald-400/15 border border-emerald-300/30 text-emerald-100 px-2 py-0.5 rounded-lg">Logged {todayRecord.totalHours}</span>}
                  {todayRecord.status && <span className="text-[11px] font-bold bg-white/15 border border-white/20 px-2 py-0.5 rounded-lg">{todayRecord.status}</span>}
                </div>
              </div>

              {/* AAJ KAHAN SE KAAM: Office ya Work From Home. Punch in se pehle chuno, wahi status save hota hai. */}
              {!noPunch && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Working from</span>
                  <div className="flex bg-white/10 border border-white/15 rounded-xl p-0.5">
                    {[['Present', 'Office', Building2], ['WFH', 'Home (WFH)', Home]].map(([value, label, Icon]) => {
                      const selected = value === 'WFH' ? todayRecord.status === 'WFH' : todayRecord.status !== 'WFH';
                      return (
                        <button
                          key={value} type="button" disabled={isStatusLocked}
                          onClick={() => handleRecordChange('status', value)}
                          className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${selected ? 'bg-white text-blue-800 shadow' : 'text-blue-100 hover:bg-white/10'} ${isStatusLocked && !selected ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <Icon size={12} /> {label}
                        </button>
                      );
                    })}
                  </div>
                  {isStatusLocked
                    ? <span className="text-[10px] font-semibold text-blue-200/80 flex items-center gap-1"><Lock size={10} /> Saved for today</span>
                    : <span className="text-[10px] font-semibold text-blue-200/80">Choose before you punch in</span>}
                </div>
              )}

              {noPunch ? (
                <p className="text-sm font-semibold text-blue-100 py-4 text-center">Today is marked as <b className="text-white">{todayRecord.status}</b>, so punch in / out is not needed.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    onClick={handlePunchIn}
                    disabled={isInTimeLocked || saving || fetchingLocation}
                    title={`Punch In as ${todayRecord.status === 'WFH' ? 'Work From Home' : 'Present (Office)'}: captures time and GPS location, saves instantly`}
                    className={`group text-left rounded-2xl p-3 sm:p-4 border transition-all min-w-0 ${isInTimeLocked ? 'bg-white/10 border-white/15 cursor-default' : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-900/30 hover:-translate-y-0.5 active:translate-y-0'} disabled:opacity-90`}
                  >
                    <span className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><LogIn size={14} /> Punch In</span>
                      {isInTimeLocked ? <CheckCircle2 size={15} className="text-emerald-300" /> : <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded">Tap</span>}
                    </span>
                    <span className="block text-2xl sm:text-3xl font-black font-mono mt-1">{todayRecord.inTime || '--:--'}</span>
                    <span className="block text-[10px] font-semibold text-white/80 truncate mt-0.5 min-h-[14px]">{todayRecord.inLocation ? `📍 ${todayRecord.inLocation.split('|')[0]}` : (isInTimeLocked ? '' : todayRecord.status === 'WFH' ? 'Tap to start your day from home' : 'Tap to start your day')}</span>
                  </button>

                  <button
                    onClick={handlePunchOut}
                    disabled={isOutTimeLocked || !isInTimeLocked || saving || fetchingLocation}
                    title={!isInTimeLocked ? 'Punch in first' : 'Punch Out (captures time and GPS location, saves instantly)'}
                    className={`group text-left rounded-2xl p-3 sm:p-4 border transition-all min-w-0 ${isOutTimeLocked ? 'bg-white/10 border-white/15 cursor-default' : !isInTimeLocked ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60' : 'bg-rose-500 hover:bg-rose-400 border-rose-300 shadow-lg shadow-rose-900/30 hover:-translate-y-0.5 active:translate-y-0'}`}
                  >
                    <span className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><LogOut size={14} /> Punch Out</span>
                      {isOutTimeLocked ? <CheckCircle2 size={15} className="text-emerald-300" /> : isInTimeLocked ? <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded">Tap</span> : null}
                    </span>
                    <span className="block text-2xl sm:text-3xl font-black font-mono mt-1">{todayRecord.outTime || '--:--'}</span>
                    <span className="block text-[10px] font-semibold text-white/80 truncate mt-0.5 min-h-[14px]">{todayRecord.outLocation ? `📍 ${todayRecord.outLocation.split('|')[0]}` : (isOutTimeLocked ? '' : isInTimeLocked ? 'Tap when you finish work' : 'Available after punch in')}</span>
                  </button>
                </div>
              )}
              <p className="text-[10px] font-semibold text-blue-200/80 mt-2.5">
                {saving ? 'Saving your attendance...' : 'One tap captures the time and your location and saves it. For Leave / Half Day / WFH use "Today\'s Details" below.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🔴 TOGGLE: My Performance | My Profile */}
      <div className="flex justify-center sm:justify-start">
        <div className="inline-flex bg-white border border-slate-200 shadow-sm rounded-2xl p-1 w-full sm:w-auto">
          {[['performance', 'My Performance', TrendingUp], ['profile', 'My Profile', IdCard]].map(([value, label, Icon]) => (
            <button
              key={value} onClick={() => setTab(value)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === value ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= TAB 1: MY PERFORMANCE ================= */}
      {/* Dono tab hamesha bane rehte hain (sirf chhupte hain) taaki Quick Add ke form aur ginti chalti rahe */}
      <div className={`space-y-4 md:space-y-6 ${tab === 'performance' ? '' : 'hidden'}`}>
        {/* SUCCESS LIST + CALENDAR: top card ke theek neeche */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <div className="xl:col-span-1 min-w-0">
            <SuccessList onCount={setTodoStats} openSignal={todoSignal} />
          </div>
          {/* Calendar & Meetings (reminder: subah 9:30, 30 min pehle, 10 min pehle) */}
          <div id="my-calendar" className="xl:col-span-2 min-w-0 scroll-mt-24">
            <MeetingCalendar openSignal={meetingSignal} />
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
          <StatTile icon={CheckCircle2} label="Present" value={monthStats.present + monthStats.halfDay + monthStats.wfh} hint={monthStats.halfDay ? `${monthStats.halfDay} half day` : 'this month'} tone="bg-emerald-50 text-emerald-600" delay={0} />
          <StatTile icon={CalendarX} label="Leave / Absent" value={monthStats.leave + monthStats.absent} hint="this month" tone="bg-rose-50 text-rose-600" delay={60} />
          <StatTile icon={AlarmClock} label="Late Marks" value={monthStats.late} hint="this month" tone="bg-amber-50 text-amber-600" delay={120} />
          <StatTile icon={Timer} label="Hours Worked" value={hoursText(monthStats.minutes)} hint={monthStats.average ? `avg ${hoursText(monthStats.average)} / day` : 'this month'} tone="bg-blue-50 text-blue-600" delay={180} />
          <StatTile icon={ClipboardList} label="Open Tasks" value={canSeeWork ? taskStats.open : '—'} hint={taskStats.overdue ? `${taskStats.overdue} overdue` : 'assigned to you'} tone="bg-purple-50 text-purple-600" delay={240} />
          <StatTile icon={ListTodo} label="Success List" value={todoStats.pending} hint={todoStats.overdue ? `${todoStats.overdue} overdue` : 'pending'} tone="bg-indigo-50 text-indigo-600" delay={300} />
        </div>

        {/* MY PERFORMANCE: role ke hisaab se charts */}
        <PerformanceCharts attendance={allAttendance} monthKey={selectedMonth} workTasks={myTasks} />

        {/* MY WORK: mujhe diye gaye tasks */}
        {canSeeWork && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6 flex flex-col min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center"><ClipboardList size={18} /></span>
                <div>
                  <h3 className="text-base font-black text-slate-800">My Work</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{taskStats.open} open{taskStats.overdue ? ` · ${taskStats.overdue} overdue` : ''} · assigned to you</p>
                </div>
              </div>
              <Link to="/work-management" className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl flex items-center gap-1">Open <ArrowUpRight size={12} /></Link>
            </div>
            {taskStats.next.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
                <CheckCircle2 size={36} className="text-slate-200 mb-2" />
                <p className="text-sm font-bold text-slate-500">No open tasks right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {taskStats.next.map(task => (
                  <div key={task._id} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${task.isOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{task.taskTitle || task.clientName || task.serviceCategory || 'Task'}</p>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{[task.taskId ? `#${task.taskId}` : '', task.clientName, task.serviceCategory].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200">{task.currentStatus}</span>
                      {task.dueDate && <p className={`text-[10px] font-bold mt-1 ${task.isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>Due {new Date(task.dueDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })}</p>}
                    </div>
                  </div>
                ))}
                {taskStats.open > taskStats.next.length && <p className="text-[11px] font-semibold text-slate-400 text-center pt-1">+{taskStats.open - taskStats.next.length} more in Work Management</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= TAB 2: MY PROFILE ================= */}
      <div className={`space-y-4 md:space-y-6 ${tab === 'profile' ? '' : 'hidden'}`}>
        {/* ID CARD + TODAY'S ATTENDANCE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <EmployeeCard profile={myProfile} user={user} onDuty={onDuty} />
          </div>

          <div className="lg:col-span-2">
            {!myProfile ? (
              <div className="mp-rise bg-white h-full p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <AlertCircle size={44} className="text-amber-500 mb-3" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Attendance Profile Not Linked</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-md">Your HR employee record has not been linked to your login yet. Please contact the Administrator to complete your onboarding. Your Success List and Calendar below work as usual.</p>
              </div>
            ) : (
              <div className="mp-rise bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6 h-full flex flex-col" style={{ animationDelay: '80ms' }}>
                <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Clock size={18} /></span>
                    <div>
                      <h3 className="text-base font-black text-slate-800">Today's Details</h3>
                      <p className="text-[11px] text-slate-400 font-medium">{new Date(localToday).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {todayRecord.totalHours && (
                      <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700">Logged: <span className="font-black">{todayRecord.totalHours}</span></span>
                    )}
                    {todayRecord.status && <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${statusStyle(todayRecord.status)}`}>{todayRecord.status}</span>}
                  </div>
                </div>

                {/* AAJ KA IN / OUT (punch button upar Quick Attendance me hain) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[['Punch In', todayRecord.inTime, todayRecord.inLocation, isInTimeLocked, 'border-blue-200 bg-blue-50/50', 'text-blue-600'], ['Punch Out', todayRecord.outTime, todayRecord.outLocation, isOutTimeLocked, 'border-rose-200 bg-rose-50/50', 'text-rose-600']].map(([label, time, place, locked, activeStyle, placeColor]) => {
                    const [address, mapLink] = String(place || '').split('|');
                    return (
                      <div key={label} className={`rounded-2xl border p-3 sm:p-4 min-w-0 ${time ? activeStyle : 'border-slate-200 bg-slate-50/50'}`}>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">{label} {locked && <Lock size={12} className="text-emerald-500" />}</p>
                        <p className="text-2xl font-black font-mono text-slate-800 mt-1">{time || '--:--'}</p>
                        <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 min-h-[14px] ${placeColor}`}>
                          {address && <><MapPin size={10} className="shrink-0" /><span className="truncate" title={address}>{address}</span></>}
                          {mapLink && <a href={mapLink} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:underline flex items-center gap-0.5">Map <ExternalLink size={9} /></a>}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex justify-between">
                      Status {isStatusLocked && <Lock size={12} className="text-emerald-500" />}
                    </label>
                    <select
                      value={todayRecord.status}
                      onChange={(e) => handleRecordChange('status', e.target.value)}
                      disabled={isStatusLocked}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>Select...</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Leave">Leave</option>
                      <option value="WFH">WFH</option>
                      <option value="Weekly Off">Weekly Off</option>
                      <option value="Holiday">Holiday</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex justify-between">
                      Remarks / Notes {isOutTimeLocked && <Lock size={12} className="text-emerald-500" />}
                    </label>
                    <input
                      type="text"
                      placeholder="Any notes..."
                      value={todayRecord.remarks}
                      onChange={(e) => handleRecordChange('remarks', e.target.value)}
                      disabled={isOutTimeLocked}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className={`text-xs font-semibold ${hasUnsavedChanges ? 'text-amber-600' : 'text-slate-400'}`}>
                    {hasUnsavedChanges ? 'You have unsaved changes. Press Save to confirm.' : 'Punch in / out saves by itself. Use Save only after changing status or remarks.'}
                  </p>
                  <button
                    onClick={submitAttendance}
                    disabled={saving || !hasUnsavedChanges}
                    className={`h-[44px] w-full sm:w-auto px-6 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${hasUnsavedChanges ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' : 'bg-slate-400 cursor-not-allowed opacity-80'}`}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : (hasUnsavedChanges ? 'Save Attendance' : 'Up to Date')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ATTENDANCE SHEET */}
        {myProfile && (
          <div id="attendance-sheet" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-24">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Calendar size={18} /></span>
                <div>
                  <h3 className="text-base font-black text-slate-800">Attendance Sheet</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{monthName} · {filteredHistory.length} day{filteredHistory.length === 1 ? '' : 's'} recorded</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  max={currentMonthStr}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className="text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm cursor-pointer"
                />
              </div>
            </div>

            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap gap-1.5 sm:gap-2">
              {[
                ['Present', monthStats.present, 'bg-emerald-50 text-emerald-700 border-emerald-200'],
                ['Half Day', monthStats.halfDay, 'bg-amber-50 text-amber-700 border-amber-200'],
                ['WFH', monthStats.wfh, 'bg-sky-50 text-sky-700 border-sky-200'],
                ['Leave', monthStats.leave, 'bg-orange-50 text-orange-700 border-orange-200'],
                ['Absent', monthStats.absent, 'bg-rose-50 text-rose-700 border-rose-200'],
                ['Late', monthStats.late, 'bg-yellow-50 text-yellow-700 border-yellow-200'],
                ['Total Hours', hoursText(monthStats.minutes), 'bg-blue-50 text-blue-700 border-blue-200']
              ].map(([label, value, style]) => (
                <span key={label} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${style}`}>{label}: <span className="font-black">{value}</span></span>
              ))}
            </div>

            {/* Mobile par bhi yahi table: side me scroll hoti hai */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-center">In</th>
                    <th className="py-3 px-3 text-center">Out</th>
                    <th className="py-3 px-3 text-center">Hours</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-12 text-slate-400">No attendance records found for this month.</td></tr>
                  ) : (
                    filteredHistory.map((row) => {
                      const displayDate = row.date.split('T')[0];
                      const dayName = new Date(displayDate).toLocaleDateString('en-US', { weekday: 'short' });
                      const isWeekend = dayName === 'Sat' || dayName === 'Sun';
                      const isToday = displayDate === localToday;

                      return (
                        <tr key={row._id || displayDate} className={`hover:bg-blue-50/40 transition-colors ${isToday ? 'bg-blue-50/60' : isWeekend ? 'bg-slate-50/60' : ''}`}>
                          <td className="py-3 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center leading-none border ${isToday ? 'bg-blue-600 text-white border-blue-600' : isWeekend ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-white text-slate-700 border-slate-200'}`}>
                                <span className="text-sm font-black">{new Date(displayDate).getDate()}</span>
                                <span className="text-[8px] font-bold uppercase">{dayName}</span>
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-xs">{new Date(displayDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                {isToday && <p className="text-[10px] font-bold text-blue-600">Today</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyle(row.status)}`}>{row.status || '-'}</span>
                              {row.isLate && <span className="px-1.5 py-1 rounded-md text-[10px] font-bold uppercase border border-yellow-200 bg-yellow-50 text-yellow-700">Late</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{row.inTime || '-'}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{row.outTime || '-'}</td>
                          <td className="py-3 px-3 text-center">
                            {row.totalHours ? (
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 whitespace-nowrap">{row.totalHours}</span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-3 max-w-[220px]">
                            {(row.inLocation || row.outLocation) ? (
                              <div className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-500">
                                {renderLocationDisplay(row.inLocation, 'IN')}
                                {renderLocationDisplay(row.outLocation, 'OUT')}
                              </div>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-5 text-xs text-slate-500 truncate max-w-[160px]" title={row.remarks}>{row.remarks || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPortal;
