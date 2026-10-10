import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { formatIstTime, formatIstDate, istDateKey, istToday, toIstInputValue, istInputToIso } from '../utils/time';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Edit, Trash2,
  CheckCircle2, Circle, Bell, Loader2, Users, PhoneCall, ClipboardList, Star, Maximize2, Search
} from 'lucide-react';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_STYLE = {
  Meeting: { icon: Users, chip: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' },
  Call: { icon: PhoneCall, chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
  Task: { icon: ClipboardList, chip: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
  Other: { icon: Star, chip: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
};

const emptyForm = (dateKey) => ({ title: '', type: 'Meeting', date: dateKey, time: '11:00', location: '', notes: '' });

// 🔴 CALENDAR & MEETINGS: date + time ke saath meeting / kaam set karo.
// Reminder notification: us din subah 9:30, phir 30 minute pehle, phir 10 minute pehle.
// openSignal: bahar ke quick button se nayi meeting / reminder ka form kholne ke liye
const MeetingCalendar = ({ openSignal = 0 }) => {
  const { user } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${user.token}` };
  const today = istToday();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(today.slice(0, 7)); // 'YYYY-MM'
  const [selectedDate, setSelectedDate] = useState(today);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm(today));
  const [saving, setSaving] = useState(false);

  // 🔴 VIEW ALL: saari meetings / kaam ek badi screen (popup) me
  const [viewAll, setViewAll] = useState(false);
  const [allFilter, setAllFilter] = useState('Upcoming'); // 'Upcoming' | 'Past' | 'Done' | 'All'
  const [allSearch, setAllSearch] = useState('');

  const fetchMeetings = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/meetings`, { headers });
      setMeetings(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    // eslint-disable-next-line
  }, [user.token]);

  // Date ('YYYY-MM-DD') ke hisaab se meetings
  const byDate = useMemo(() => {
    const map = {};
    meetings.forEach(m => {
      const key = istDateKey(m.startAt);
      (map[key] = map[key] || []).push(m);
    });
    Object.values(map).forEach(list => list.sort((a, b) => new Date(a.startAt) - new Date(b.startAt)));
    return map;
  }, [meetings]);

  // Month grid: pehle khali khane, phir 1..N
  const calendarCells = useMemo(() => {
    const [year, month] = viewMonth.split('-').map(Number);
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells = Array.from({ length: firstWeekday }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${viewMonth}-${String(d).padStart(2, '0')}`);
    return cells;
  }, [viewMonth]);

  const changeMonth = (step) => {
    const [year, month] = viewMonth.split('-').map(Number);
    setViewMonth(new Date(Date.UTC(year, month - 1 + step, 1)).toISOString().slice(0, 7));
  };

  const goToToday = () => { setViewMonth(today.slice(0, 7)); setSelectedDate(today); };

  const monthLabel = new Date(`${viewMonth}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const selectedMeetings = byDate[selectedDate] || [];

  const upcoming = useMemo(() => {
    const now = Date.now();
    return meetings
      .filter(m => m.status === 'Scheduled' && new Date(m.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
      .slice(0, 4);
  }, [meetings]);

  // View All popup: filter + search, date ke hisaab se group
  const allGroups = useMemo(() => {
    const now = Date.now();
    const text = allSearch.trim().toLowerCase();
    const list = meetings.filter(m => {
      const time = new Date(m.startAt).getTime();
      if (allFilter === 'Upcoming' && !(m.status === 'Scheduled' && time >= now)) return false;
      if (allFilter === 'Past' && !(m.status === 'Scheduled' && time < now)) return false;
      if (allFilter === 'Done' && m.status !== 'Done') return false;
      if (text && !`${m.title} ${m.location || ''} ${m.notes || ''} ${m.type}`.toLowerCase().includes(text)) return false;
      return true;
    }).sort((a, b) => (allFilter === 'Upcoming' ? new Date(a.startAt) - new Date(b.startAt) : new Date(b.startAt) - new Date(a.startAt)));

    const groups = [];
    list.forEach(m => {
      const key = istDateKey(m.startAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(m); else groups.push({ key, items: [m] });
    });
    return { groups, count: list.length };
  }, [meetings, allFilter, allSearch]);

  const allCounts = useMemo(() => {
    const now = Date.now();
    return {
      Upcoming: meetings.filter(m => m.status === 'Scheduled' && new Date(m.startAt).getTime() >= now).length,
      Past: meetings.filter(m => m.status === 'Scheduled' && new Date(m.startAt).getTime() < now).length,
      Done: meetings.filter(m => m.status === 'Done').length,
      All: meetings.length
    };
  }, [meetings]);

  const openNew = (dateKey = selectedDate) => {
    setEditingId(null);
    setForm(emptyForm(dateKey < today ? today : dateKey));
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (openSignal > 0) openNew(today);
    // eslint-disable-next-line
  }, [openSignal]);

  const openEdit = (meeting) => {
    const local = toIstInputValue(meeting.startAt); // 'YYYY-MM-DDTHH:mm' India time
    setEditingId(meeting._id);
    setForm({
      title: meeting.title, type: meeting.type || 'Meeting',
      date: local.slice(0, 10), time: local.slice(11, 16),
      location: meeting.location || '', notes: meeting.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.time) return toast.error("Title, date and time are required!");
    setSaving(true);
    try {
      const payload = {
        title: form.title, type: form.type, location: form.location, notes: form.notes,
        startAt: istInputToIso(`${form.date}T${form.time}`) // India time -> pakka instant
      };
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/meetings/${editingId}`, payload, { headers });
        toast.success("Schedule updated!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/meetings`, payload, { headers });
        toast.success("Added to calendar! Reminders are set.");
      }
      setIsModalOpen(false);
      setSelectedDate(form.date);
      setViewMonth(form.date.slice(0, 7));
      fetchMeetings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (meeting) => {
    const status = meeting.status === 'Done' ? 'Scheduled' : 'Done';
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/meetings/${meeting._id}`, { status }, { headers });
      setMeetings(prev => prev.map(m => (m._id === meeting._id ? { ...m, status } : m)));
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (meeting) => {
    if (!window.confirm(`Delete "${meeting.title}" from calendar?`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/meetings/${meeting._id}`, { headers });
      setMeetings(prev => prev.filter(m => m._id !== meeting._id));
      toast.success("Removed from calendar");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const renderMeeting = (meeting, showDate = false) => {
    const style = TYPE_STYLE[meeting.type] || TYPE_STYLE.Other;
    const TypeIcon = style.icon;
    const isDone = meeting.status === 'Done';
    const isPast = !isDone && new Date(meeting.startAt).getTime() < Date.now();

    return (
      <div key={meeting._id} className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${isDone ? 'bg-slate-50 border-slate-200 opacity-70' : isPast ? 'bg-rose-50/40 border-rose-100' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}>
        <button onClick={() => toggleDone(meeting)} className={`mt-0.5 shrink-0 transition-colors ${isDone ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`} title={isDone ? 'Mark as not done' : 'Mark as done'}>
          {isDone ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-800 flex items-center gap-1"><Clock size={13} className="text-indigo-500"/> {formatIstTime(meeting.startAt)}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 ${style.chip}`}><TypeIcon size={10}/> {meeting.type}</span>
            {isPast && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-100 text-rose-700 border-rose-200">Time passed</span>}
            {showDate && <span className="text-[10px] font-bold text-slate-400">{formatIstDate(meeting.startAt, { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
          </div>
          <p className={`text-sm font-bold mt-1 break-words ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{meeting.title}</p>
          {meeting.location && <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11}/> {meeting.location}</p>}
          {meeting.notes && <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap break-words">{meeting.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => openEdit(meeting)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit / Reschedule"><Edit size={14}/></button>
          <button onClick={() => handleDelete(meeting)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete"><Trash2 size={14}/></button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6">
      {/* HEADING */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600"><CalendarDays size={18}/></div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-800 leading-tight">Calendar & Meetings</h2>
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1"><Bell size={10}/> Reminders: 9:30 AM that day, 30 min before and 10 min before</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewAll(true)} title="See everything on a big screen" className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
            <Maximize2 size={13}/> View All
          </button>
          <button onClick={() => openNew()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
            <Plus size={14}/> Add Meeting / Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* MONTH CALENDAR */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="Previous month"><ChevronLeft size={18}/></button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">{monthLabel}</span>
              <button onClick={goToToday} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors">Today</button>
            </div>
            <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="Next month"><ChevronRight size={18}/></button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK_DAYS.map(day => (
              <div key={day} className={`text-[10px] font-bold uppercase py-1 ${day === 'Sun' ? 'text-rose-400' : 'text-slate-400'}`}>{day}</div>
            ))}
            {calendarCells.map((dateKey, idx) => {
              if (!dateKey) return <div key={`blank-${idx}`}></div>;
              const dayMeetings = byDate[dateKey] || [];
              const pending = dayMeetings.filter(m => m.status === 'Scheduled').length;
              const isToday = dateKey === today;
              const isSelected = dateKey === selectedDate;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  onDoubleClick={() => openNew(dateKey)}
                  title={dayMeetings.length ? `${dayMeetings.length} item(s)` : 'Double-click to add'}
                  className={`relative h-10 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                    isSelected ? 'bg-indigo-600 text-white shadow-md'
                    : isToday ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                    : dateKey < today ? 'text-slate-400 hover:bg-slate-100'
                    : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Number(dateKey.slice(8))}
                  {dayMeetings.length > 0 && (
                    <span className="flex gap-0.5 mt-0.5">
                      {dayMeetings.slice(0, 3).map(m => (
                        <span key={m._id} className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : m.status === 'Done' ? 'bg-slate-300' : (TYPE_STYLE[m.type] || TYPE_STYLE.Other).dot}`}></span>
                      ))}
                    </span>
                  )}
                  {pending > 0 && !isSelected && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black h-3.5 min-w-[14px] px-0.5 rounded-full flex items-center justify-center">{pending}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED DAY + UPCOMING */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-w-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-slate-700">
                {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                {selectedDate === today && <span className="ml-2 text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Today</span>}
              </p>
              <span className="text-[10px] font-bold text-slate-400">{selectedMeetings.length} item(s)</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                <p className="text-xs text-slate-400 py-6 text-center"><Loader2 size={16} className="animate-spin inline-block mr-2"/> Loading calendar...</p>
              ) : selectedMeetings.length === 0 ? (
                <button onClick={() => openNew(selectedDate)} className="w-full text-center py-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                  <p className="text-xs font-bold">Nothing scheduled on this day.</p>
                  <p className="text-[11px] mt-0.5">Click to add a meeting or task</p>
                </button>
              ) : selectedMeetings.map(m => renderMeeting(m))}
            </div>
          </div>

          {upcoming.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Coming Up Next</p>
              <div className="space-y-2">
                {upcoming.map(m => renderMeeting(m, true))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIEW ALL POPUP (add / edit ka form is se upar khulta hai) */}
      {viewAll && (
        <div className="fixed inset-0 z-[45] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4" onClick={() => setViewAll(false)}>
          <div className="bg-slate-50 rounded-3xl w-full max-w-3xl h-[92vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-4 sm:px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><CalendarDays size={18}/></span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-slate-800">Calendar & Meetings</h2>
                    <p className="text-[11px] text-slate-400 font-medium">{allCounts.Upcoming} upcoming · {allCounts.Past} time passed · {allCounts.Done} done</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openNew(today)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Add</button>
                  <button onClick={() => setViewAll(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={18}/></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400"/>
                  <input type="text" value={allSearch} onChange={(e) => setAllSearch(e.target.value)} placeholder="Search title, place, notes..." className="w-full text-xs font-semibold border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"/>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-xl overflow-x-auto">
                  {['Upcoming', 'Past', 'Done', 'All'].map(value => (
                    <button key={value} onClick={() => setAllFilter(value)} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all ${allFilter === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{value === 'Past' ? 'Time Passed' : value} ({allCounts[value]})</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {allGroups.count === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <CalendarDays size={40} className="text-slate-200 mb-2"/>
                  <p className="text-sm font-bold text-slate-500">Nothing found here.</p>
                </div>
              ) : allGroups.groups.map(group => (
                <div key={group.key}>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    {new Date(`${group.key}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    {group.key === today && <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Today</span>}
                    <span className="flex-1 h-px bg-slate-200"></span>
                  </p>
                  <div className="space-y-2">{group.items.map(m => renderMeeting(m))}</div>
                </div>
              ))}
            </div>
            <div className="bg-white px-4 sm:px-6 py-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-400">Showing {allGroups.count} item{allGroups.count === 1 ? '' : 's'}</div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays size={18} className="text-indigo-600"/> {editingId ? 'Edit / Reschedule' : 'Add Meeting or Task'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/50"><X size={18}/></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title *</label>
                <input type="text" required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Meeting with Hotel Ranjana" className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(TYPE_STYLE).map(type => (
                    <button type="button" key={type} onClick={() => setForm({ ...form, type })} className={`py-2 text-xs font-bold rounded-xl border transition-all ${form.type === type ? `${TYPE_STYLE[type].chip} ring-2 ring-indigo-500/30` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Date *</label>
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Time (India) *</label>
                  <input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Place / Link (optional)</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Office, client site, Google Meet link..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Notes (optional)</label>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Agenda or anything to remember..." className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2 text-[11px] font-semibold text-indigo-700">
                <Bell size={14} className="shrink-0 mt-0.5"/>
                <span>You will get a notification at 9:30 AM on that day, then 30 minutes before and 10 minutes before the set time.</span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 inline-flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} {editingId ? 'Save Changes' : 'Add to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingCalendar;
