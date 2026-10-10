import React, { useState, useMemo } from 'react';
import { ClipboardList, ChevronDown, User, UserCheck, CalendarClock, Flag, Landmark, AlertCircle, CheckCircle2, ArrowRight, ArrowUpRight, MessageSquare, History, RefreshCw, Check } from 'lucide-react';
import { formatIstDate, formatIstDateTime } from '../utils/time';

// 🔴 CLIENT KE WORK MANAGEMENT TASKS (Client Master ke profile me)
// Is client ke liye jo bhi task assign hua: ID, kaun kar raha hai, kisne diya, kaam kahan tak pahuncha aur poori history.

const STAGES = ['Not Started', 'Started', 'In Progress', 'Under Review', 'Completed'];
// Har status kis padaav (stage) par hai
const stageOf = (status) => {
  if (status === 'Completed') return 4;
  if (status === 'Under Review' || status === 'Approved') return 3;
  if (status === 'Started') return 1;
  if (!status || status === 'Not Started') return 0;
  return 2; // In Progress, Pending Client / Government / Internal, Waiting for Documents, Correction Required, On Hold
};

const statusStyle = (status) => {
  if (status === 'Completed' || status === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Cancelled') return 'bg-slate-100 text-slate-500 border-slate-200';
  if (status === 'Under Review') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (String(status).startsWith('Pending') || status === 'Waiting for Documents' || status === 'On Hold') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'Correction Required') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'In Progress' || status === 'Started') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};
const priorityStyle = (priority) => (priority === 'Urgent' ? 'text-rose-700 bg-rose-50' : priority === 'High' ? 'text-orange-700 bg-orange-50' : priority === 'Medium' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 bg-slate-100');

const day = (value) => (value ? formatIstDate(value, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// Task ke remarks ek hi lambi text me jude hote hain ("📅 date | 👤 naam \n 💬 message"): alag-alag entries me todna
const parseRemarks = (remarks) => {
  const text = String(remarks || '').trim();
  if (!text) return [];
  if (!text.includes('📅')) return [{ when: '', by: '', message: text }];
  return text.split('📅').map(block => block.trim()).filter(Boolean).map(block => {
    const [head, ...rest] = block.split('\n');
    const [when, by] = head.split('|').map(part => part.replace('👤', '').trim());
    return { when: when || '', by: by || '', message: rest.join('\n').replace('💬', '').trim() || head };
  });
};

const Stepper = ({ status }) => {
  if (status === 'Cancelled') return <p className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg px-3 py-2">This task was cancelled.</p>;
  const current = stageOf(status);
  return (
    <div className="flex items-start">
      {STAGES.map((stage, index) => {
        const done = index < current || status === 'Completed';
        const active = index === current && status !== 'Completed';
        return (
          <div key={stage} className="flex-1 flex flex-col items-center relative min-w-0">
            {index > 0 && <span className={`absolute top-3 right-1/2 w-full h-0.5 ${index <= current ? 'bg-emerald-400' : 'bg-slate-200'}`}></span>}
            <span className={`relative z-10 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-white border-blue-500 text-blue-600 ring-4 ring-blue-100' : 'bg-white border-slate-300 text-slate-400'}`}>
              {done ? <Check size={12} strokeWidth={3} /> : index + 1}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-bold mt-1 text-center leading-tight px-0.5 ${done ? 'text-emerald-700' : active ? 'text-blue-700' : 'text-slate-400'}`}>{stage}</span>
          </div>
        );
      })}
    </div>
  );
};

const ClientTasksPanel = ({ tasks = [], loading, canOpenWork, onOpenWork }) => {
  const [filter, setFilter] = useState('Open');
  const [openId, setOpenId] = useState(null);

  const counts = useMemo(() => {
    const closed = (t) => ['Completed', 'Cancelled'].includes(t.currentStatus);
    return {
      All: tasks.length,
      Open: tasks.filter(t => !closed(t)).length,
      Completed: tasks.filter(t => t.currentStatus === 'Completed').length,
      Overdue: tasks.filter(t => t.isOverdue).length
    };
  }, [tasks]);

  const shown = useMemo(() => tasks.filter(t => {
    if (filter === 'Open') return !['Completed', 'Cancelled'].includes(t.currentStatus);
    if (filter === 'Completed') return t.currentStatus === 'Completed';
    if (filter === 'Overdue') return t.isOverdue;
    return true;
  }), [tasks, filter]);

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <ClipboardList size={18} className="text-blue-600" /> Work Management Tasks
        </h3>
        {tasks.length > 0 && (
          <div className="flex bg-slate-100 p-0.5 rounded-xl overflow-x-auto">
            {['Open', 'Completed', 'Overdue', 'All'].map(value => (
              <button key={value} onClick={() => setFilter(value)} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all ${filter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {value} ({counts[value]})
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] font-medium text-slate-500 mb-4 pb-3 border-b border-slate-100">Every task assigned for this client: who is doing it, who assigned it, how far it has reached and the full history. Click a task to open it.</p>

      {loading ? (
        <p className="text-xs text-slate-400 py-8 text-center"><RefreshCw size={15} className="animate-spin inline-block mr-2" /> Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200">
          <ClipboardList size={32} className="mx-auto text-slate-200 mb-2" />
          <p className="text-xs font-bold text-slate-500">No task has been assigned for this client yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Select this client while assigning a task in Work Management and it will appear here.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-xs font-semibold text-slate-400 py-8 text-center">No {filter.toLowerCase()} tasks for this client.</p>
      ) : (
        <div className="space-y-3">
          {shown.map(task => {
            const isOpen = openId === task._id;
            const remarks = parseRemarks(task.remarks);
            const history = task.history || [];
            // Jo remark status badalne ke saath history me aa chuka hai use dobara nahi dikhate
            const extraRemarks = remarks.filter(r => !history.some(h => h.remark && h.remark.trim() === r.message.trim()));
            const lastUpdate = history[history.length - 1];

            return (
              <div key={task._id} className={`rounded-2xl border transition-all ${task.isOverdue ? 'border-rose-200' : isOpen ? 'border-blue-300 shadow-sm' : 'border-slate-200 hover:border-blue-200'}`}>
                {/* SUMMARY (click = khulta / band hota hai) */}
                <button onClick={() => setOpenId(isOpen ? null : task._id)} className="w-full text-left p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="font-bold text-blue-700 font-mono text-xs bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{task.taskId}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusStyle(task.currentStatus)}`}>{task.currentStatus}</span>
                        {task.isOverdue && <span className="text-[9px] font-bold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1"><AlertCircle size={10} /> Overdue</span>}
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${priorityStyle(task.priority)}`}><Flag size={9} /> {task.priority}</span>
                        {task.govStatus && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700 flex items-center gap-1"><Landmark size={10} /> {task.govStatus}</span>}
                      </div>
                      <p className="text-sm font-bold text-slate-800">{task.taskTitle || `${task.serviceCategory} · ${task.subService}`}</p>
                      {task.taskTitle && <p className="text-[11px] font-semibold text-slate-500">{task.serviceCategory} · {task.subService}</p>}
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 mt-3 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0"><User size={13} className="text-indigo-500 shrink-0" /><span className="text-slate-400 font-semibold shrink-0">Doing:</span><span className="font-bold text-slate-700 truncate">{task.assignedTo?.name || 'Unassigned'}</span></div>
                    <div className="flex items-center gap-1.5 min-w-0"><UserCheck size={13} className="text-emerald-500 shrink-0" /><span className="text-slate-400 font-semibold shrink-0">Assigned by:</span><span className="font-bold text-slate-700 truncate">{task.assignedBy?.name || '—'}</span></div>
                    <div className="flex items-center gap-1.5 min-w-0"><CalendarClock size={13} className="text-slate-400 shrink-0" /><span className="text-slate-400 font-semibold shrink-0">Assigned:</span><span className="font-bold text-slate-700 truncate">{day(task.assignmentDate || task.createdAt)}</span></div>
                    <div className="flex items-center gap-1.5 min-w-0"><CalendarClock size={13} className={`shrink-0 ${task.isOverdue ? 'text-rose-500' : 'text-slate-400'}`} /><span className="text-slate-400 font-semibold shrink-0">Due:</span><span className={`font-bold truncate ${task.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>{day(task.dueDate)}</span></div>
                  </div>

                  <div className="mt-4"><Stepper status={task.currentStatus} /></div>
                </button>

                {/* POORI DETAIL */}
                {isOpen && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50 rounded-b-2xl">
                    {task.taskDescription && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Task Description</p>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap break-words bg-white border border-slate-200 rounded-xl p-3">{task.taskDescription}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {[
                        ['Work Started', day(task.startDate)],
                        ['Completed On', task.currentStatus === 'Completed' ? day(task.completionDate) : '—'],
                        ['Next Follow-up', day(task.nextFollowUpDate)],
                        ['Reviewer', task.reviewer?.name ? `${task.reviewer.name}${task.reviewStatus ? ` · ${task.reviewStatus}` : ''}` : '—'],
                        ['Complexity', task.complexity || '—'],
                        ['Employee ID', task.assignedTo?.empId || '—'],
                        ['Last Update', lastUpdate ? formatIstDateTime(lastUpdate.at) : formatIstDateTime(task.updatedAt)],
                        ['Output File', task.outputFileUrl ? 'Uploaded' : (task.outputRequired === 'Yes' ? 'Required' : 'Not required')]
                      ].map(([label, value]) => (
                        <div key={label} className="bg-white border border-slate-200 rounded-xl px-3 py-2 min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                          <p className="text-xs font-bold text-slate-700 truncate" title={value}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {task.pendingReason && (
                      <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"><span className="font-black">Pending reason:</span> {task.pendingReason}</p>
                    )}

                    {/* KAAM KI HISTORY: kab, kisne, kaunsa status */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><History size={12} /> Work History ({history.length})</p>
                      {history.length === 0 ? (
                        <p className="text-xs text-slate-400">No status updates recorded yet.</p>
                      ) : (
                        <div className="relative pl-5 space-y-3 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-200">
                          {[...history].reverse().map((entry, index) => (
                            <div key={index} className="relative">
                              <span className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${entry.newStatus === 'Completed' ? 'bg-emerald-500' : index === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                                    {entry.oldStatus && entry.oldStatus !== entry.newStatus && (
                                      <><span className={`px-1.5 py-0.5 rounded border ${statusStyle(entry.oldStatus)}`}>{entry.oldStatus}</span><ArrowRight size={12} className="text-slate-400" /></>
                                    )}
                                    <span className={`px-1.5 py-0.5 rounded border ${statusStyle(entry.newStatus)}`}>{entry.newStatus}</span>
                                    {entry.newStatus === 'Completed' && <CheckCircle2 size={13} className="text-emerald-500" />}
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-500">{entry.by || 'Unknown'} · {formatIstDateTime(entry.at)}</span>
                                </div>
                                {entry.remark && <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap break-words">{entry.remark}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {extraRemarks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><MessageSquare size={12} /> Other Remarks ({extraRemarks.length})</p>
                        <div className="space-y-2">
                          {[...extraRemarks].reverse().map((remark, index) => (
                            <div key={index} className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                              {(remark.by || remark.when) && <p className="text-[10px] font-semibold text-slate-500 mb-0.5">{[remark.by, remark.when].filter(Boolean).join(' · ')}</p>}
                              <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{remark.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {canOpenWork && (
                      <div className="flex justify-end">
                        <button onClick={() => onOpenWork(task)} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-2 rounded-xl transition-colors">
                          Open in Work Management <ArrowUpRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientTasksPanel;
