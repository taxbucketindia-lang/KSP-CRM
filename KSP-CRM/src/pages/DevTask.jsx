import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  Code, Plus, Layers, AlertCircle, Clock, CheckCircle2, User, Loader2, Edit3, X, MessageSquare, Trash2, Edit, Search,
  GitBranch, GitPullRequest, Link2, Paperclip, Copy, Ban, CalendarDays, ListChecks, LayoutGrid, List, ChevronRight, Bug, Sparkles, Palette, Database, Wrench, Send, Globe
} from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { isAdminRole } from '../utils/roles';
import { formatIstDate, formatIstDateTime, istDateKey, istToday } from '../utils/time';

const STATUSES = ['Backlog', 'Start', 'In Progress', 'Testing / Review', 'Completed'];
const TYPES = ['Bug Fix', 'New Feature', 'UI Improvement', 'Database Optimization', 'Other'];
const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];
const ENVIRONMENTS = ['Local', 'Staging', 'Production'];

const statusColors = {
  'Backlog': 'bg-slate-100 text-slate-600 border-slate-200',
  'Start': 'bg-blue-50 text-blue-600 border-blue-200',
  'In Progress': 'bg-purple-50 text-purple-600 border-purple-200',
  'Testing / Review': 'bg-amber-50 text-amber-600 border-amber-200',
  'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-200'
};
const statusDot = { 'Backlog': 'bg-slate-400', 'Start': 'bg-blue-500', 'In Progress': 'bg-purple-500', 'Testing / Review': 'bg-amber-500', 'Completed': 'bg-emerald-500' };
const priorityColors = {
  'Urgent': 'text-red-600 bg-red-50', 'High': 'text-orange-600 bg-orange-50',
  'Medium': 'text-blue-600 bg-blue-50', 'Low': 'text-slate-600 bg-slate-100'
};
const typeMeta = {
  'Bug Fix': { icon: Bug, color: 'text-rose-600 bg-rose-50', prefix: 'fix' },
  'New Feature': { icon: Sparkles, color: 'text-indigo-600 bg-indigo-50', prefix: 'feature' },
  'UI Improvement': { icon: Palette, color: 'text-pink-600 bg-pink-50', prefix: 'ui' },
  'Database Optimization': { icon: Database, color: 'text-cyan-700 bg-cyan-50', prefix: 'db' },
  'Other': { icon: Wrench, color: 'text-slate-600 bg-slate-100', prefix: 'task' }
};

const inputClass = 'w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';
const labelClass = 'block text-xs font-bold uppercase text-slate-600 mb-1';

// Task ka chhota naam (DEV-12): commit / branch / baat-cheet me kaam aata hai
const taskCode = (task) => (task.taskNo ? `DEV-${task.taskNo}` : `DEV-${String(task._id).slice(-4).toUpperCase()}`);
const isOverdue = (task) => !!task.dueDate && task.status !== 'Completed' && istDateKey(task.dueDate) < istToday();
const dateInput = (date) => (date ? istDateKey(date) : '');
const isLink = (value) => /^https?:\/\//i.test(String(value || ''));
const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
// Git branch ka sujhav: fix/dev-12-login-error
const suggestBranch = (task) => [typeMeta[task.taskType]?.prefix || 'task', [task.taskNo ? `dev-${task.taskNo}` : '', slug(task.title)].filter(Boolean).join('-')].join('/');
const errorText = (error, fallback) => error?.response?.data?.message || fallback;

const copyText = async (value, message = 'Copied') => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    toast.error('Could not copy');
  }
};

const Modal = ({ title, onClose, children, width = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3" onClick={onClose}>
    <div className={`bg-white rounded-2xl w-full ${width} shadow-2xl max-h-[92vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-black text-slate-800 truncate">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={20} /></button>
      </div>
      <div className="overflow-y-auto p-6">{children}</div>
    </div>
  </div>
);

// ============================================================
// NAYA TASK / EDIT TASK (ek hi form)
// ============================================================
const TaskForm = ({ task, developers, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    title: task?.title || '', module: task?.module || '', taskType: task?.taskType || 'New Feature', priority: task?.priority || 'Medium',
    assignedTo: task?.assignedTo || '', startDate: dateInput(task?.startDate), dueDate: dateInput(task?.dueDate),
    estimatedHours: task?.estimatedHours || '', environment: task?.environment || '', pageUrl: task?.pageUrl || '',
    branchName: task?.branchName || '', attachmentUrl: task?.attachmentUrl || '', description: task?.description || '',
    checklist: (task?.checklist || []).map(item => item.text).join('\n')
  });
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const ok = await onSubmit(form);
    if (!ok) setSaving(false);
  };

  return (
    <Modal title={task ? `Edit ${taskCode(task)}` : 'Assign New Dev Task'} onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Task Title *</label>
          <input type="text" required maxLength={200} value={form.title} onChange={set('title')} placeholder="e.g. Fix login error on invoice page" className={`${inputClass} font-semibold`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Module *</label>
            <input type="text" required maxLength={80} value={form.module} onChange={set('module')} placeholder="e.g. GST, Invoice, HR" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Assigned To *</label>
            <select required value={form.assignedTo} onChange={set('assignedTo')} className={`${inputClass} font-bold text-blue-700`}>
              <option value="">Select Developer</option>
              {/* Purana developer list me na ho toh bhi uska naam dikhe */}
              {form.assignedTo && !developers.some(dev => (dev.name || dev.username) === form.assignedTo) && <option value={form.assignedTo}>{form.assignedTo}</option>}
              {developers.map(dev => {
                const name = dev.name || dev.username;
                return <option key={dev._id} value={name}>{name} (ID: {dev.empId || dev.employeeId || String(dev._id).slice(-6)})</option>;
              })}
            </select>
          </div>
          <div>
            <label className={labelClass}>Task Type</label>
            <select value={form.taskType} onChange={set('taskType')} className={inputClass}>{TYPES.map(type => <option key={type}>{type}</option>)}</select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select value={form.priority} onChange={set('priority')} className={inputClass}>{PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select>
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <input type="date" value={form.startDate} onChange={set('startDate')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input type="date" value={form.dueDate} min={form.startDate || undefined} onChange={set('dueDate')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Est. Hours</label>
            <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={set('estimatedHours')} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Environment</label>
            <select value={form.environment} onChange={set('environment')} className={inputClass}>
              <option value="">Not specified</option>
              {ENVIRONMENTS.map(env => <option key={env}>{env}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Detailed Description *</label>
          <textarea required rows="4" maxLength={5000} value={form.description} onChange={set('description')} placeholder={form.taskType === 'Bug Fix' ? 'Steps to reproduce:\n1. ...\n\nExpected: ...\nActual: ...' : 'What needs to be built and why...'} className={`${inputClass} resize-y`}></textarea>
        </div>

        <div>
          <label className={labelClass}>Checklist / Acceptance Points</label>
          <textarea rows="3" value={form.checklist} onChange={set('checklist')} placeholder={'One point per line, e.g.\nAPI validation added\nTested on mobile'} className={`${inputClass} resize-y`}></textarea>
          <p className="text-[11px] text-slate-400 mt-1">The developer ticks these off while working.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Page / Screen / API</label>
            <input type="text" maxLength={300} value={form.pageUrl} onChange={set('pageUrl')} placeholder="e.g. /service/gst or https://..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Screenshot / Reference Link</label>
            <input type="text" maxLength={500} value={form.attachmentUrl} onChange={set('attachmentUrl')} placeholder="https://..." className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Git Branch</label>
            <div className="flex gap-2">
              <input type="text" maxLength={120} value={form.branchName} onChange={set('branchName')} placeholder="Optional: developer can set it later" className={`${inputClass} font-mono`} />
              <button type="button" disabled={!form.title} onClick={() => setForm(prev => ({ ...prev, branchName: suggestBranch({ ...prev, taskNo: task?.taskNo }) }))} className="shrink-0 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Suggest</button>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white rounded-xl font-bold flex justify-center items-center gap-2">
          {saving ? <Loader2 size={18} className="animate-spin" /> : (task ? <Edit size={16} /> : <Plus size={18} />)} {task ? 'Save Changes' : 'Assign Task'}
        </button>
      </form>
    </Modal>
  );
};

// ============================================================
// PROGRESS UPDATE (developer ke liye)
// ============================================================
const ProgressModal = ({ task, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    status: task.status, remark: '', hoursWorked: '', branchName: task.branchName || '', prLink: task.prLink || '',
    isBlocked: !!task.isBlocked, blockedReason: task.blockedReason || ''
  });
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const pending = (task.checklist || []).filter(item => !item.done).length;

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (form.isBlocked && !form.blockedReason.trim()) return toast.error('Please write what is blocking this task');
    setSaving(true);
    const ok = await onSubmit({
      status: form.status, remarkMessage: form.remark, hoursWorked: form.hoursWorked, branchName: form.branchName, prLink: form.prLink,
      isBlocked: form.isBlocked, blockedReason: form.blockedReason
    });
    if (!ok) setSaving(false);
  };

  return (
    <Modal title={`Update Progress · ${taskCode(task)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={set('status')} className={`${inputClass} font-bold`}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select>
          </div>
          <div>
            <label className={labelClass}>Hours Worked Now</label>
            <input type="number" min="0" step="0.25" value={form.hoursWorked} onChange={set('hoursWorked')} placeholder="e.g. 1.5" className={inputClass} />
            <p className="text-[11px] text-slate-400 mt-1">Logged so far: {task.hoursSpent || 0} hrs{task.estimatedHours ? ` of ${task.estimatedHours}` : ''}</p>
          </div>
        </div>

        {form.status === 'Completed' && pending > 0 && (
          <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{pending} checklist point{pending > 1 ? 's are' : ' is'} still not ticked.</p>
        )}

        <div>
          <label className={labelClass}>What was done? *</label>
          <textarea required rows="3" value={form.remark} onChange={set('remark')} placeholder="What progress was made? What is left?" className={`${inputClass} resize-none`}></textarea>
        </div>

        <div>
          <label className={labelClass}>Git Branch</label>
          <div className="flex gap-2">
            <input type="text" maxLength={120} value={form.branchName} onChange={set('branchName')} placeholder={suggestBranch(task)} className={`${inputClass} font-mono`} />
            <button type="button" onClick={() => setForm(prev => ({ ...prev, branchName: suggestBranch(task) }))} className="shrink-0 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">Suggest</button>
          </div>
        </div>
        <div>
          <label className={labelClass}>PR / Commit Link</label>
          <input type="text" maxLength={300} value={form.prLink} onChange={set('prLink')} placeholder="https://github.com/.../pull/12" className={inputClass} />
        </div>

        <div className={`rounded-xl border p-3 ${form.isBlocked ? 'border-rose-200 bg-rose-50' : 'border-slate-200'}`}>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isBlocked} onChange={set('isBlocked')} className="rounded" /> I am blocked on this task
          </label>
          {form.isBlocked && (
            <input type="text" maxLength={300} value={form.blockedReason} onChange={set('blockedReason')} placeholder="What do you need? e.g. API key, design, access, reply from client" className={`${inputClass} mt-2`} />
          )}
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold flex justify-center items-center gap-2">
          {saving && <Loader2 size={18} className="animate-spin" />} Update Progress
        </button>
      </form>
    </Modal>
  );
};

// ============================================================
// TASK KI POORI DETAIL
// ============================================================
const HoursBar = ({ task }) => {
  const spent = task.hoursSpent || 0;
  const estimate = task.estimatedHours || 0;
  if (!spent && !estimate) return null;
  const over = estimate > 0 && spent > estimate;
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
        <span className="flex items-center gap-1"><Clock size={12} /> Time</span>
        <span className={over ? 'text-rose-600 font-bold' : ''}>{spent} hrs logged{estimate ? ` / ${estimate} hrs estimated` : ''}</span>
      </div>
      {estimate > 0 && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (spent / estimate) * 100)}%` }}></div>
        </div>
      )}
    </div>
  );
};

const TaskDetail = ({ task, mine, canManage, onClose, onProgress, onEdit, onDelete, onToggleItem, onComment }) => {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const TypeIcon = typeMeta[task.taskType]?.icon || Wrench;
  const checklist = task.checklist || [];
  const done = checklist.filter(item => item.done).length;
  const canWork = mine || canManage;

  const send = async (e) => {
    e.preventDefault();
    if (!comment.trim() || sending) return;
    setSending(true);
    if (await onComment(comment.trim())) setComment('');
    setSending(false);
  };

  const infoRow = (Icon, label, content) => (
    <div className="flex items-start gap-2 text-xs">
      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
      <span className="font-bold text-slate-500 w-24 shrink-0">{label}</span>
      <div className="min-w-0 flex-1 text-slate-700 font-medium break-words">{content}</div>
    </div>
  );
  const linkOrText = (value) => (isLink(value)
    ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{value}</a>
    : <span className="break-all">{value}</span>);

  return (
    <Modal title={`${taskCode(task)} · ${task.title}`} onClose={onClose} width="max-w-3xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColors[task.status]}`}>{task.status}</span>
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${typeMeta[task.taskType]?.color}`}><TypeIcon size={11} /> {task.taskType}</span>
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${priorityColors[task.priority]}`}>{task.priority}</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{task.module}</span>
          {isOverdue(task) && <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-600 text-white">Overdue</span>}
          <div className="ml-auto flex items-center gap-2">
            {canWork && <button onClick={onProgress} className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800"><Edit3 size={13} /> Update Progress</button>}
            {canManage && <button onClick={onEdit} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg" title="Edit Task"><Edit size={14} /></button>}
            {canManage && <button onClick={onDelete} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Delete Task"><Trash2 size={14} /></button>}
          </div>
        </div>

        {task.isBlocked && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
            <Ban size={16} className="text-rose-600 mt-0.5 shrink-0" />
            <div><p className="text-xs font-black text-rose-700 uppercase">Blocked</p><p className="text-sm text-rose-800">{task.blockedReason}</p></div>
          </div>
        )}

        <div>
          <p className={labelClass}>Description</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words bg-slate-50 border border-slate-100 rounded-xl p-3">{task.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 bg-white border border-slate-200 rounded-xl p-4">
          {infoRow(User, 'Developer', task.assignedTo)}
          {infoRow(User, 'Assigned by', `${task.assignedByName || '—'} · ${formatIstDateTime(task.createdAt)}`)}
          {infoRow(CalendarDays, 'Start date', task.startDate ? formatIstDate(task.startDate) : '—')}
          {infoRow(CalendarDays, 'Due date', task.dueDate ? <span className={isOverdue(task) ? 'text-red-600 font-bold' : ''}>{formatIstDate(task.dueDate)}</span> : '—')}
          {task.startedAt && infoRow(Clock, 'Work started', formatIstDateTime(task.startedAt))}
          {task.completedAt && infoRow(CheckCircle2, 'Completed', formatIstDateTime(task.completedAt))}
          {task.environment && infoRow(Globe, 'Environment', task.environment)}
          {task.pageUrl && infoRow(Link2, 'Page / API', linkOrText(task.pageUrl))}
          {task.attachmentUrl && infoRow(Paperclip, 'Reference', linkOrText(task.attachmentUrl))}
          {task.prLink && infoRow(GitPullRequest, 'PR / Commit', linkOrText(task.prLink))}
          <div className="md:col-span-2">
            {infoRow(GitBranch, 'Git branch', task.branchName ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="bg-slate-900 text-emerald-300 px-2 py-0.5 rounded text-[11px]">{task.branchName}</code>
                <button onClick={() => copyText(task.branchName, 'Branch name copied')} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"><Copy size={11} /> Copy</button>
                <button onClick={() => copyText(`git checkout -b ${task.branchName}`, 'Git command copied')} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"><Copy size={11} /> git checkout -b</button>
              </div>
            ) : <span className="text-slate-400">Not set yet. Suggested: <code className="text-slate-600">{suggestBranch(task)}</code></span>)}
          </div>
        </div>

        <HoursBar task={task} />

        {checklist.length > 0 && (
          <div>
            <p className={`${labelClass} flex items-center gap-1.5`}><ListChecks size={13} /> Checklist · {done}/{checklist.length} done</p>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(done / checklist.length) * 100}%` }}></div>
            </div>
            <div className="space-y-1">
              {checklist.map(item => (
                <label key={item._id} className={`flex items-start gap-2 text-sm px-2 py-1.5 rounded-lg ${canWork ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                  <input type="checkbox" checked={item.done} disabled={!canWork} onChange={(e) => onToggleItem(item._id, e.target.checked)} className="mt-0.5 rounded" />
                  <span className={item.done ? 'line-through text-slate-400' : 'text-slate-700'}>{item.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className={`${labelClass} flex items-center gap-1.5`}><MessageSquare size={13} /> Updates & Comments ({(task.remarks || []).length})</p>
          <form onSubmit={send} className="flex gap-2 mb-3">
            <input type="text" maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment or question..." className={inputClass} />
            <button type="submit" disabled={sending || !comment.trim()} className="shrink-0 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">{sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send</button>
          </form>
          {(task.remarks || []).length === 0 ? (
            <p className="text-xs text-slate-400">No updates yet.</p>
          ) : (
            <div className="space-y-2">
              {[...task.remarks].reverse().map((remark, index) => (
                <div key={remark._id || index} className="bg-white border border-slate-200 p-3 rounded-xl text-xs">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-1 text-[11px] text-slate-500 font-medium">
                    <span className="font-bold text-slate-700">{remark.employeeName}</span>
                    <span className="flex items-center gap-2">
                      {remark.hours > 0 && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">{remark.hours} hrs</span>}
                      {remark.status && <span className={`px-1.5 py-0.5 rounded border font-bold ${statusColors[remark.status] || ''}`}>{remark.status}</span>}
                      {formatIstDateTime(remark.date)}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800 whitespace-pre-wrap break-words">{remark.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ============================================================
// PAGE
// ============================================================
const DevTask = () => {
  const { user } = useContext(AuthContext);
  const headers = useMemo(() => (user?.token ? { Authorization: `Bearer ${user.token}` } : {}), [user?.token]);
  const api = `${import.meta.env.VITE_API_URL}/devtasks`;

  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [view, setView] = useState('board');
  const [filters, setFilters] = useState({ search: '', mine: user?.role === 'Developer', developer: '', status: 'All', priority: '', type: '', date: '' });
  const [formTask, setFormTask] = useState(null);       // null | 'new' | task (edit)
  const [progressId, setProgressId] = useState(null);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const taskRes = await axios.get(api, { headers });
        setTasks(taskRes.data.data || []);

        const userRes = await axios.get(`${import.meta.env.VITE_API_URL}/users/all-developers`, { headers });
        const allUsers = userRes.data.data || userRes.data || [];
        const devsOnly = allUsers.filter(u =>
          u.role?.toLowerCase() === 'developer' ||
          u.department?.toLowerCase() === 'development' ||
          u.designation?.toLowerCase()?.includes('developer')
        );
        setDevelopers(devsOnly.length > 0 ? devsOnly : allUsers);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [api, headers]);

  const isMine = (task) => [user?.name, user?.username].filter(Boolean).includes(task.assignedTo);
  // Edit / delete: jisne task diya ya Admin / CEO
  const canManage = (task) => isAdminRole(user?.role) || (!!task.assignedBy && String(task.assignedBy) === String(user?._id));
  const replaceTask = (updated) => setTasks(prev => prev.map(t => (t._id === updated._id ? updated : t)));

  const saveTask = async (form) => {
    try {
      if (formTask === 'new') {
        const res = await axios.post(api, form, { headers });
        setTasks(prev => [res.data.data, ...prev]);
        toast.success("Development Task Assigned!");
      } else {
        const res = await axios.put(`${api}/${formTask._id}/edit`, form, { headers });
        replaceTask(res.data.data);
        toast.success("Task updated successfully!");
      }
      setFormTask(null);
      return true;
    } catch (error) {
      toast.error(errorText(error, "Failed to save task"));
      return false;
    }
  };

  const updateProgress = async (id, payload, message = "Task Progress Updated!") => {
    try {
      const res = await axios.put(`${api}/${id}`, payload, { headers });
      replaceTask(res.data.data);
      toast.success(message);
      setProgressId(null);
      return true;
    } catch (error) {
      toast.error(errorText(error, "Failed to update progress"));
      return false;
    }
  };

  const toggleItem = async (id, itemId, done) => {
    try {
      const res = await axios.put(`${api}/${id}/checklist/${itemId}`, { done }, { headers });
      replaceTask(res.data.data);
    } catch (error) {
      toast.error(errorText(error, "Failed to update checklist"));
    }
  };

  const addComment = async (id, message) => {
    try {
      const res = await axios.post(`${api}/${id}/remarks`, { message }, { headers });
      replaceTask(res.data.data);
      return true;
    } catch (error) {
      toast.error(errorText(error, "Failed to add comment"));
      return false;
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete ${taskCode(task)} "${task.title}"?`)) return;
    try {
      await axios.delete(`${api}/${task._id}`, { headers });
      setTasks(prev => prev.filter(t => t._id !== task._id));
      setDetailId(null);
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error(errorText(error, "Failed to delete task"));
    }
  };

  // Status ke alawa baaki filter (board me status column khud hi filter hai)
  const scopedTasks = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return tasks.filter(task => {
      if (filters.mine && ![user?.name, user?.username].filter(Boolean).includes(task.assignedTo)) return false;
      if (filters.developer && task.assignedTo !== filters.developer) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.type && task.taskType !== filters.type) return false;
      if (filters.date && istDateKey(task.createdAt || task.startDate) !== filters.date) return false;
      if (search && ![task.title, task.module, task.description, task.branchName, task.assignedTo, taskCode(task)].some(value => String(value || '').toLowerCase().includes(search))) return false;
      return true;
    });
  }, [tasks, filters, user?.name, user?.username]);

  const listTasks = scopedTasks.filter(task => filters.status === 'All' || task.status === filters.status);

  const stats = useMemo(() => {
    const open = scopedTasks.filter(t => t.status !== 'Completed');
    return [
      ['Open', open.length, Layers, 'bg-slate-100 text-slate-600'],
      ['In Progress', scopedTasks.filter(t => t.status === 'Start' || t.status === 'In Progress').length, Code, 'bg-purple-50 text-purple-600'],
      ['In Review', scopedTasks.filter(t => t.status === 'Testing / Review').length, GitPullRequest, 'bg-amber-50 text-amber-600'],
      ['Blocked', open.filter(t => t.isBlocked).length, Ban, 'bg-rose-50 text-rose-600'],
      ['Overdue', open.filter(isOverdue).length, AlertCircle, 'bg-red-50 text-red-600'],
      ['Completed', scopedTasks.length - open.length, CheckCircle2, 'bg-emerald-50 text-emerald-600']
    ];
  }, [scopedTasks]);
  const hours = useMemo(() => ({
    spent: Math.round(scopedTasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0) * 100) / 100,
    estimated: Math.round(scopedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) * 100) / 100
  }), [scopedTasks]);

  const developerNames = useMemo(() => [...new Set([...developers.map(dev => dev.name || dev.username), ...tasks.map(t => t.assignedTo)].filter(Boolean))].sort(), [developers, tasks]);
  const setFilter = (field) => (e) => setFilters(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const filterClass = 'p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700 outline-none';

  const detailTask = tasks.find(t => t._id === detailId);
  const progressTask = tasks.find(t => t._id === progressId);

  // Zaroori kaam pehle: Urgent upar, phir jiski due date paas hai
  const byUrgency = (a, b) => (PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority))
    || (new Date(a.dueDate || '2999-01-01') - new Date(b.dueDate || '2999-01-01'));

  const TaskCard = ({ task, compact }) => {
    const TypeIcon = typeMeta[task.taskType]?.icon || Wrench;
    const checklist = task.checklist || [];
    const done = checklist.filter(item => item.done).length;
    const overdue = isOverdue(task);
    const mine = isMine(task);
    const next = STATUSES[STATUSES.indexOf(task.status) + 1];

    return (
      <div onClick={() => setDetailId(task._id)} className={`bg-white border rounded-2xl p-3.5 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all ${task.isBlocked ? 'border-rose-300' : overdue ? 'border-red-200' : 'border-slate-200'}`}>
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-500">{taskCode(task)}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${typeMeta[task.taskType]?.color}`}><TypeIcon size={10} /> {task.taskType}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColors[task.priority]}`}>{task.priority}</span>
          {!compact && <span className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusColors[task.status]}`}>{task.status}</span>}
        </div>
        <h3 className="text-sm font-bold text-slate-800 leading-snug">{task.title}</h3>
        {!compact && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{task.description}</p>}
        <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">{task.module}</p>

        {task.isBlocked && <p className="mt-2 text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-lg px-2 py-1 flex items-start gap-1"><Ban size={11} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{task.blockedReason}</span></p>}

        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1 text-blue-700"><User size={11} /> {task.assignedTo}</span>
          {task.dueDate && <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-bold' : ''}`}><CalendarDays size={11} /> {formatIstDate(task.dueDate, { day: '2-digit', month: 'short' })}{overdue ? ' · overdue' : ''}</span>}
          {(task.hoursSpent > 0 || task.estimatedHours > 0) && <span className="flex items-center gap-1"><Clock size={11} /> {task.hoursSpent || 0}{task.estimatedHours ? `/${task.estimatedHours}` : ''}h</span>}
          {checklist.length > 0 && <span className={`flex items-center gap-1 ${done === checklist.length ? 'text-emerald-600' : ''}`}><ListChecks size={11} /> {done}/{checklist.length}</span>}
          {task.branchName && <span className="flex items-center gap-1" title={task.branchName}><GitBranch size={11} /></span>}
          {task.prLink && <span className="flex items-center gap-1" title="PR / commit linked"><GitPullRequest size={11} /></span>}
          {(task.remarks || []).length > 0 && <span className="flex items-center gap-1"><MessageSquare size={11} /> {task.remarks.length}</span>}
        </div>

        {mine && next && (
          <div className="flex gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setProgressId(task._id)} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold bg-slate-900 text-white px-2 py-1.5 rounded-lg hover:bg-slate-800"><Edit3 size={11} /> Update</button>
            <button onClick={() => updateProgress(task._id, { status: next }, `Moved to ${next}`)} title={`Move to ${next}`} className="flex items-center justify-center gap-0.5 text-[11px] font-bold border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-50 whitespace-nowrap">{next} <ChevronRight size={11} /></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-6 space-y-5 relative">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Code className="text-blue-600" /> Development Tasks Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">Board, checklist, time log, Git branch / PR and blockers for every dev task.</p>
        </div>
        <button onClick={() => setFormTask('new')} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow"><Plus size={16} /> New Task</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        {stats.map(([label, value, Icon, color]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
            <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon size={16} /></span>
            <div><p className="text-lg font-black text-slate-800 leading-none">{value}</p><p className="text-[10px] font-bold uppercase text-slate-400 mt-1">{label}</p></div>
          </div>
        ))}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
          <span className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600"><Clock size={16} /></span>
          <div><p className="text-lg font-black text-slate-800 leading-none">{hours.spent}<span className="text-xs text-slate-400 font-bold"> / {hours.estimated}h</span></p><p className="text-[10px] font-bold uppercase text-slate-400 mt-1">Logged / Est.</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input type="text" value={filters.search} onChange={setFilter('search')} placeholder="Search title, DEV-12, module, branch..." className={`${filterClass} w-full pl-8`} />
        </div>
        <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border select-none ${filters.mine ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
          <input type="checkbox" checked={filters.mine} onChange={setFilter('mine')} className="hidden" /> <User size={12} /> My Tasks
        </label>
        <select value={filters.developer} onChange={setFilter('developer')} className={filterClass}>
          <option value="">All Developers</option>
          {developerNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        {view === 'list' && (
          <select value={filters.status} onChange={setFilter('status')} className={filterClass}>
            <option value="All">All Status</option>
            {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        )}
        <select value={filters.priority} onChange={setFilter('priority')} className={filterClass}>
          <option value="">All Priority</option>
          {PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
        </select>
        <select value={filters.type} onChange={setFilter('type')} className={filterClass}>
          <option value="">All Types</option>
          {TYPES.map(type => <option key={type}>{type}</option>)}
        </select>
        <input type="date" value={filters.date} onChange={setFilter('date')} title="Assigned on" className={filterClass} />
        {filters.date && <button onClick={() => setFilters(prev => ({ ...prev, date: '' }))} className="text-xs text-red-600 font-bold hover:underline">Clear Date</button>}
        <div className="flex bg-slate-100 rounded-xl p-0.5 ml-auto">
          <button onClick={() => setView('board')} className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg ${view === 'board' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><LayoutGrid size={13} /> Board</button>
          <button onClick={() => setView('list')} className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg ${view === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><List size={13} /> List</button>
        </div>
      </div>

      {fetchLoading ? (
        <div className="text-center py-16 text-slate-500 font-medium"><Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500" />Loading Tasks...</div>
      ) : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {STATUSES.map(status => {
            const columnTasks = scopedTasks.filter(task => task.status === status).sort(byUrgency);
            return (
              <div key={status} className="w-[290px] shrink-0 bg-slate-100/70 rounded-2xl p-2.5 flex flex-col max-h-[72vh]">
                <div className="flex items-center gap-2 px-1.5 py-1.5">
                  <span className={`h-2 w-2 rounded-full ${statusDot[status]}`}></span>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-700">{status}</p>
                  <span className="ml-auto text-[11px] font-bold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                </div>
                <div className="space-y-2.5 overflow-y-auto pr-0.5 flex-1">
                  {columnTasks.length === 0
                    ? <p className="text-center text-[11px] text-slate-400 font-medium py-6">No tasks</p>
                    : columnTasks.map(task => <TaskCard key={task._id} task={task} compact />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : listTasks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {listTasks.map(task => <TaskCard key={task._id} task={task} />)}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400 font-medium bg-white border border-dashed border-slate-300 rounded-2xl">No tasks found matching the filter.</div>
      )}

      {detailTask && !progressTask && !formTask && (
        <TaskDetail
          task={detailTask} mine={isMine(detailTask)} canManage={canManage(detailTask)}
          onClose={() => setDetailId(null)}
          onProgress={() => setProgressId(detailTask._id)}
          onEdit={() => setFormTask(detailTask)}
          onDelete={() => handleDeleteTask(detailTask)}
          onToggleItem={(itemId, done) => toggleItem(detailTask._id, itemId, done)}
          onComment={(message) => addComment(detailTask._id, message)}
        />
      )}
      {progressTask && <ProgressModal task={progressTask} onClose={() => setProgressId(null)} onSubmit={(payload) => updateProgress(progressTask._id, payload)} />}
      {formTask && <TaskForm task={formTask === 'new' ? null : formTask} developers={developers} onClose={() => setFormTask(null)} onSubmit={saveTask} />}
    </div>
  );
};

export default DevTask;
