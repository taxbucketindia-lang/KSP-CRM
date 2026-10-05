import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Cake, CalendarDays, CalendarCheck, Send, Clock, AlertTriangle, 
  UserX, Search, MessageCircle, Mail, History, X, CheckCircle2, 
  RefreshCw, User, Phone, ShieldCheck
} from 'lucide-react';

const BirthdayWishes = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, clientsList: [], logs: [] });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [sendModal, setSendModal] = useState({ open: false, client: null, message: '', channel: 'WhatsApp' });
  const [historyModal, setHistoryModal] = useState({ open: false, client: null, logs: [] });
  const [sending, setSending] = useState(false);

  const fetchBirthdayData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/birthdays/dashboard`, { headers });
      setData(res.data);
    } catch (error) {
      toast.error("Failed to load birthday data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdayData();
    // eslint-disable-next-line
  }, [user.token]);

  const calculateAge = (dobString) => {
    if (!dobString) return '-';
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const getNextBirthday = (dobString) => {
    if (!dobString) return new Date(9999, 11, 31).getTime(); 
    
    const dob = new Date(dobString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    
    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }
    return nextBday.getTime();
  };

  const filteredClients = useMemo(() => {
    const filtered = data.clientsList.filter(client => {
      const matchesSearch = client.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            client.clientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            client.mobile?.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'ALL' || client.birthdayStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const dateA = getNextBirthday(a.dob);
      const dateB = getNextBirthday(b.dob);
      return dateA - dateB;
    });
  }, [data.clientsList, searchQuery, statusFilter]);

  const openSendModal = (client) => {
    const defaultMsg = `Happy Birthday, ${client.name}!\n\nWishing you a very happy birthday and a year filled with happiness, good health and success.\n\nThank you for being a valued client of TaxBucket. We truly appreciate your trust and association with us.\n\nWarm Regards,\nTeam TaxBucket\nTaxBucket.in - Bridging the Gap.`;
    
    setSendModal({ 
      open: true, 
      client, 
      message: defaultMsg, 
      channel: client.mobile ? 'WhatsApp' : 'Email' 
    });
  };

  const handleManualSend = async (e) => {
    e.preventDefault();
    
    const clientPhone = sendModal.client.mobile;
    const clientEmail = sendModal.client.email;
    const messageText = sendModal.message;

    if (sendModal.channel === 'WhatsApp') {
      if (!clientPhone) return toast.error("Mobile number is missing for this client!");
      const encodedText = encodeURIComponent(messageText);
      const waLink = `https://wa.me/91${clientPhone.replace(/\D/g, '')}?text=${encodedText}`;
      window.open(waLink, '_blank');
    } else if (sendModal.channel === 'Email') {
      if (!clientEmail) return toast.error("Email ID is missing for this client!");
      const encodedSubject = encodeURIComponent(`Happy Birthday ${sendModal.client.name}! 🎉`);
      const encodedBody = encodeURIComponent(messageText);
      const mailtoLink = `mailto:${clientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
      window.location.href = mailtoLink;
    }

    setSending(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${import.meta.env.VITE_API_URL}/birthdays/send-manual`, {
        clientId: sendModal.client._id,
        channel: sendModal.channel,
        message: messageText
      }, { headers });
      
      toast.success(`${sendModal.channel} Wish Action Recorded! 🎉`);
      setSendModal({ open: false, client: null, message: '', channel: 'WhatsApp' });
      fetchBirthdayData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save log in database");
    } finally {
      setSending(false);
    }
  };

  const openHistoryModal = (client) => {
    const clientLogs = data.logs.filter(l => l.client === client._id || l.client?._id === client._id);
    setHistoryModal({ open: true, client, logs: clientLogs });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <RefreshCw className="animate-spin text-pink-500" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Birthday Engine...</p>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-12 space-y-6">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Cake size={32} className="text-pink-500" /> Client Birthday Wishes
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Automated relationship management and greetings dashboard.</p>
        </div>
        <button onClick={fetchBirthdayData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold shadow-sm transition-all">
          <RefreshCw size={16}/> Refresh Data
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-4 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between h-24">
          <Cake className="absolute top-2 right-2 opacity-20" size={40}/>
          <p className="text-[9px] font-black uppercase tracking-wider opacity-80">Today's Birthdays</p>
          <h3 className="text-3xl font-black">{stats.today || 0}</h3>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Upcoming 7 Days</p>
          <div className="flex items-center gap-2"><CalendarDays className="text-blue-500" size={20}/><h3 className="text-2xl font-black text-slate-800">{stats.upcoming7Days || 0}</h3></div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">This Month</p>
          <div className="flex items-center gap-2"><CalendarCheck className="text-indigo-500" size={20}/><h3 className="text-2xl font-black text-slate-800">{stats.thisMonth || 0}</h3></div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Wish Sent</p>
          <div className="flex items-center gap-2"><Send className="text-emerald-500" size={20}/><h3 className="text-2xl font-black text-emerald-700">{stats.wishSent || 0}</h3></div>
        </div>
        
        {/* 🔴 NAYA HACK: PENDING CARD KABHI MINUS MEIN NA JAYE */}
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Pending</p>
          <div className="flex items-center gap-2"><Clock className="text-amber-500" size={20}/><h3 className="text-2xl font-black text-amber-700">{Math.max(0, stats.pending || 0)}</h3></div>
        </div>
        
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <p className="text-[9px] font-bold uppercase tracking-wider text-rose-600">Failed / Error</p>
          <div className="flex items-center gap-2"><AlertTriangle className="text-rose-500" size={20}/><h3 className="text-2xl font-black text-rose-700">{stats.failed || 0}</h3></div>
        </div>
        <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between h-24">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">DOB Missing</p>
          <div className="flex items-center gap-2"><UserX className="text-slate-400" size={20}/><h3 className="text-2xl font-black text-slate-600">{stats.dobMissing || 0}</h3></div>
        </div>
      </div>

      {/* FILTER ROW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by Client Name, ID or Mobile..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-48 text-sm font-bold border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20">
          <option value="ALL">All Birthdays</option>
          <option value="Today">🎂 Today</option>
          <option value="Upcoming">⏳ Upcoming</option>
          <option value="Passed">✅ Passed</option>
        </select>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-4 px-5">Client Info</th>
                <th className="py-4 px-5">DOB & Age</th>
                <th className="py-4 px-5">Contact Details</th>
                <th className="py-4 px-5">Birthday Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredClients.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-16 text-slate-400 font-medium">No clients found matching criteria.</td></tr>
              ) : (
                filteredClients.map((client) => {
                  const age = calculateAge(client.dob);
                  const isToday = client.birthdayStatus === 'Today';

                  // 🔴 NAYA LOGIC: Check agar client ko aaj message bheja gaya hai
                  const clientLogs = data.logs.filter(l => l.client === client._id || l.client?._id === client._id);
                  const sentToday = clientLogs.some(log => 
                    new Date(log.sentAt).toDateString() === new Date().toDateString() && 
                    (log.status === 'Sent' || log.status === 'Delivered')
                  );
                  
                  return (
                    <tr key={client._id} className={`transition-colors ${isToday ? 'bg-pink-50/70 border-l-4 border-l-pink-500 hover:bg-pink-100/60' : 'hover:bg-slate-50/50 border-l-4 border-transparent'}`}>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{client.name}</span>
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-1 w-max">{client.clientId}</span>
                          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><User size={10}/> RM: {client.assignedRM}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {client.dob ? (
                          <>
                            <span className={`font-bold flex items-center gap-1.5 ${isToday ? 'text-pink-600' : 'text-slate-700'}`}>
                              <CalendarDays size={14} className={isToday ? 'text-pink-500' : 'text-slate-400'}/>
                              {new Date(client.dob).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}
                            </span>
                            <span className={`text-[11px] mt-1 block ${isToday ? 'text-pink-500 font-bold' : 'text-slate-500'}`}>Turns {age} Years</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not Added</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                          {client.mobile && <span className="flex items-center gap-1.5"><Phone size={12}/> {client.mobile}</span>}
                          {client.email && <span className="flex items-center gap-1.5"><Mail size={12}/> {client.email}</span>}
                          {!client.consent && <span className="text-[9px] uppercase text-rose-500 bg-rose-50 px-1 rounded w-max mt-1 border border-rose-100">No Consent</span>}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm flex items-center gap-1 w-max ${
                          isToday ? 'bg-pink-100 text-pink-700 border-pink-200 animate-pulse' : 
                          client.birthdayStatus === 'Passed' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {isToday && <Cake size={12}/>} {client.birthdayStatus}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openHistoryModal(client)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200" title="View History">
                            <History size={16} strokeWidth={2.5}/>
                          </button>
                          
                          {/* 🔴 NAYA SMART BUTTON LOGIC: Sent hone ke baad GREEN ho jayega */}
                          {isToday && (
                            <button 
                              onClick={() => openSendModal(client)} 
                              disabled={!client.consent}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border shadow-sm ${!client.consent ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : sentToday ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-200' : 'text-pink-700 bg-pink-50 hover:bg-pink-600 hover:text-white border-pink-200'}`} 
                              title={sentToday ? "Send Again (Already Sent)" : "Send Wish Manually"}
                            >
                              {sentToday ? <CheckCircle2 size={13} strokeWidth={2.5}/> : <Send size={13} strokeWidth={2.5}/>} 
                              {sentToday ? 'Wish Sent' : 'Send Wish'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SEND WISH MANUAL (UPDATED WITH TARGET INFO) */}
      {sendModal.open && sendModal.client && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Send className="text-pink-500" size={20}/> Send Manual Wish
              </h2>
              <button onClick={() => setSendModal({open:false, client:null, message:'', channel:'WhatsApp'})} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleManualSend} className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                 <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-200 shadow-sm shrink-0">
                    {sendModal.client.name.charAt(0).toUpperCase()}
                 </div>
                 <div>
                    <p className="text-sm font-bold text-blue-900">{sendModal.client.name}</p>
                    <p className="text-xs text-blue-700 mt-0.5">Turns {calculateAge(sendModal.client.dob)} today! 🎂</p>
                 </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Select Channel</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${sendModal.channel === 'WhatsApp' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <input type="radio" name="channel" value="WhatsApp" checked={sendModal.channel === 'WhatsApp'} onChange={(e) => setSendModal({...sendModal, channel: e.target.value})} className="hidden" />
                    <MessageCircle size={18}/> <span className="text-sm font-bold">WhatsApp</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${sendModal.channel === 'Email' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <input type="radio" name="channel" value="Email" checked={sendModal.channel === 'Email'} onChange={(e) => setSendModal({...sendModal, channel: e.target.value})} className="hidden" />
                    <Mail size={18}/> <span className="text-sm font-bold">Email</span>
                  </label>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-2 ${sendModal.channel === 'WhatsApp' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                 {sendModal.channel === 'WhatsApp' ? (
                   <>
                     <Phone size={14} className="text-emerald-600"/>
                     <span className="text-xs font-bold text-slate-600">Sending to: </span>
                     <span className="text-sm font-black text-emerald-800 tracking-wide">{sendModal.client.mobile || <span className="text-rose-500 italic text-xs">No Number Found</span>}</span>
                   </>
                 ) : (
                   <>
                     <Mail size={14} className="text-blue-600"/>
                     <span className="text-xs font-bold text-slate-600">Sending to: </span>
                     <span className="text-sm font-black text-blue-800 tracking-wide">{sendModal.client.email || <span className="text-rose-500 italic text-xs">No Email Found</span>}</span>
                   </>
                 )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Message Preview (Editable)</label>
                <textarea rows="7" required value={sendModal.message} onChange={(e) => setSendModal({...sendModal, message: e.target.value})} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-pink-500/20 outline-none resize-none bg-slate-50 leading-relaxed shadow-inner" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setSendModal({open:false, client:null, message:'', channel:'WhatsApp'})} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={sending} className="px-6 py-2.5 text-sm font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-md shadow-pink-500/20 transition-all flex items-center gap-2">
                  {sending ? <RefreshCw size={16} className="animate-spin"/> : <Send size={16} />} Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW HISTORY LOGS */}
      {historyModal.open && historyModal.client && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <History className="text-indigo-600" size={20}/> Wish History Log
                </h2>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">{historyModal.client.name}</p>
              </div>
              <button onClick={() => setHistoryModal({open:false, client:null, logs:[]})} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
               {historyModal.logs.length === 0 ? (
                  <div className="text-center py-10">
                     <History size={40} className="mx-auto text-slate-300 mb-3"/>
                     <p className="text-sm font-bold text-slate-500">No history found</p>
                     <p className="text-xs text-slate-400 mt-1">We haven't sent any wishes to this client yet.</p>
                  </div>
               ) : (
                  historyModal.logs.map((log, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-4 relative overflow-hidden">
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                       <div className="h-10 w-10 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                         {log.channel === 'WhatsApp' ? <MessageCircle size={18}/> : <Mail size={18}/>}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                             <p className="text-sm font-bold text-slate-800">{log.channel} Wish Triggered</p>
                             <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${log.status === 'Sent' || log.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                {log.status}
                             </span>
                          </div>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-2 font-medium">
                            <Clock size={12}/> {new Date(log.sentAt).toLocaleString('en-IN', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}
                            <span className="mx-1">•</span>
                            <ShieldCheck size={12}/> {log.triggeredBy ? 'Manual Action' : 'System Auto'}
                          </p>
                          {log.failureReason && (
                            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 mt-2">Error: {log.failureReason}</p>
                          )}
                       </div>
                    </div>
                  ))
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BirthdayWishes;